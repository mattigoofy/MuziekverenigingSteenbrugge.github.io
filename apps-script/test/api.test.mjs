// Tests for the Apps Script code (Code.js, Activiteiten.js, Agenda.js), run on the local simulation.
//   node --test

import test from 'node:test';
import assert from 'node:assert/strict';
import { createBackend } from '../local/gas.mjs';
import { createFixture, ACTIVITIES, day } from '../local/fixture.mjs';
import { createServer } from '../local/server.mjs';

const PROPERTIES = {
  SHEET_ID: 'test',
  NOTIFY_EMAIL: 'secretariaat@example.com',
  FIREBASE_API_KEY: 'test-key',
  CALENDAR_ID: 'leden@group.calendar.google.com',
  AGENDA_ICAL_URL: 'https://calendar.google.com/calendar/ical/geheim/basic.ics'
};

function setup(properties = PROPERTIES) {
  const backend = createBackend({ spreadsheet: createFixture(), properties, fakeAuth: true });
  const as = email => ({
    get: path => backend.request('GET', path, { query: { idToken: 'dev:' + email } }).body,
    post: (path, body) => backend.request('POST', path, { query: { idToken: 'dev:' + email }, body }).body
  });
  const activitiesSheet = backend.spreadsheet.getSheetByName('Activiteiten');
  return { backend, as, activitiesSheet };
}

function errorCode(response) {
  assert.equal(response.ok, false, JSON.stringify(response));
  return response.error.code;
}

const ids = list => list.map(a => a.id);
// row of an activity in the Activiteiten tab (column titles in row 2)
const rowOf = title => ACTIVITIES.findIndex(a => a.title === title) + 3;
const find = (me, id) => me.activities.find(a => a.id === id);

//
// general
//
test('health works without login', () => {
  const { backend } = setup();
  const response = backend.request('GET', 'health');
  assert.equal(response.mimeType, 'application/json');
  assert.deepEqual(response.body, { ok: true, data: { status: 'ok', title: 'Activiteiten 2026' } });
});

test('unknown path or method gives NOT_FOUND', () => {
  const { backend, as } = setup();
  assert.equal(errorCode(backend.request('GET', '').body), 'NOT_FOUND');
  assert.equal(errorCode(backend.request('GET', 'does-not-exist').body), 'NOT_FOUND');
  assert.equal(errorCode(as('piet@example.com').get('attendance')), 'NOT_FOUND');
  assert.equal(errorCode(backend.request('POST', 'public/activities').body), 'NOT_FOUND');
});

test('old ?par= calls no longer work', () => {
  const { backend } = setup();
  const response = backend.request('GET', '', { query: { par: 'getSpreadsheetData', email: 'piet@example.com' } });
  assert.equal(errorCode(response.body), 'NOT_FOUND');
});

//
// login
//
test('without token: UNAUTHENTICATED', () => {
  const { backend } = setup();
  assert.equal(errorCode(backend.request('GET', 'me').body), 'UNAUTHENTICATED');
  assert.equal(errorCode(backend.request('POST', 'attendance', { body: { id: 'concert-in-de-kerk', answer: 'X' } }).body), 'UNAUTHENTICATED');
});

test('token is verified with Google and cached for 5 minutes', () => {
  const calls = [];
  const fetch = (url, options) => {
    calls.push({ url, body: JSON.parse(options.payload) });
    const idToken = JSON.parse(options.payload).idToken;
    if (idToken === 'valid-token') return { status: 200, text: JSON.stringify({ users: [{ email: 'Piet@Example.com', emailVerified: true }] }) };
    if (idToken === 'unverified-token') return { status: 200, text: JSON.stringify({ users: [{ email: 'piet@example.com', emailVerified: false }] }) };
    return { status: 400, text: JSON.stringify({ error: { message: 'INVALID_ID_TOKEN' } }) };
  };
  const backend = createBackend({ spreadsheet: createFixture(), properties: PROPERTIES, fetch });

  assert.equal(errorCode(backend.request('GET', 'me', { query: { idToken: 'invalid-token' } }).body), 'UNAUTHENTICATED');
  assert.equal(calls[0].url, 'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=test-key');
  assert.deepEqual(calls[0].body, { idToken: 'invalid-token' });

  assert.equal(backend.request('GET', 'me', { query: { idToken: 'valid-token' } }).body.data.email, 'piet@example.com');
  assert.equal(backend.request('GET', 'me', { query: { idToken: 'valid-token' } }).body.ok, true);
  assert.equal(calls.length, 2, 'second request with the same token comes from the cache');
  assert.equal(errorCode(backend.request('GET', 'me', { query: { idToken: 'dev:piet@example.com' } }).body), 'UNAUTHENTICATED');
  assert.equal(errorCode(backend.request('GET', 'me', { query: { idToken: 'unverified-token' } }).body), 'EMAIL_NOT_VERIFIED', 'emailVerified missing or false');
});

test('an address that is not confirmed gets nothing, but may register', () => {
  const { backend } = setup();
  const unverified = (method, path, body) => backend.request(method, path, { query: { idToken: 'dev-unverified:piet@example.com' }, body }).body;
  assert.equal(errorCode(unverified('GET', 'me')), 'EMAIL_NOT_VERIFIED');
  assert.equal(errorCode(unverified('POST', 'attendance', { id: 'concert-in-de-kerk', answer: 'X' })), 'EMAIL_NOT_VERIFIED');
  assert.equal(backend.spreadsheet.getSheetByName('Activiteiten 2026').getRange('E5').getValue(), 'X?', 'nothing written');
  assert.deepEqual(unverified('POST', 'registrations', { name: 'Piet' }), { ok: true, data: { sent: true } });
});

test('GET /public/activities: only Op website, upcoming or without date, sorted', () => {
  const { backend } = setup();
  const response = backend.request('GET', 'public/activities').body;
  assert.equal(response.ok, true);
  const list = response.data.activities;
  // Zomerconcert is past, Repetitie/Etentje/Bestuursvergadering/Sint-Ceciliafeest are not on the website; undated last
  assert.deepEqual(ids(list), ['concert-in-de-kerk', 'kerstconcert', 'nieuwjaarsreceptie', 'lenteconcert']);

  const concert = list[0];
  assert.deepEqual(Object.keys(concert).sort(), ['description', 'descriptionEn', 'end', 'id', 'location', 'locationUrl', 'start', 'title']);
  assert.equal(concert.title, 'Concert in de kerk');
  assert.equal(concert.start, day(10, 19, 30).toISOString());
  assert.equal(concert.end, day(10, 21, 30).toISOString(), 'end "21:30" on the day of the start');
  assert.equal(concert.description, '<span style="">Gratis toegang, vrije bijdrage.</span>');
  assert.equal(concert.descriptionEn, '<span style="">Free entry, donations welcome.</span>');
  assert.equal(list[1].descriptionEn, '', 'no English description: empty, the page falls back to Dutch');
  assert.equal(list[1].end, day(40, 21, 30).toISOString(), 'empty end = start + 2 hours');
  assert.equal(list[3].start, null);
  assert.equal(list[3].end, null);
});

test('GET /public/activities contains no member data and is served from cache for 10 minutes', () => {
  const { backend, activitiesSheet } = setup();
  const first = JSON.stringify(backend.request('GET', 'public/activities').body);
  assert.doesNotMatch(first, /example\.com|piet|Info/i);

  activitiesSheet.set('A' + rowOf('Concert in de kerk'), 'Andere titel');
  assert.equal(JSON.stringify(backend.request('GET', 'public/activities').body), first, 'still from the cache');
  backend.cache.clear();
  assert.equal(backend.request('GET', 'public/activities').body.data.activities[0].title, 'Andere titel');
});

//
// members page
//
test('GET /me: attendance sheet columns linked by title, by date', () => {
  const { as } = setup();
  const me = as('piet@example.com').get('me').data;
  assert.equal(me.email, 'piet@example.com');
  assert.equal(me.title, 'Activiteiten 2026');
  assert.equal(me.readOnly, false);
  assert.equal(me.calendarUrl, PROPERTIES.AGENDA_ICAL_URL);
  assert.deepEqual(me.score, { score: 1, total: 7, background: '#ff0000' });

  // by date, undated last; "Oud concert" has no activity in Activiteiten and is hidden
  assert.deepEqual(ids(me.activities), ['repetitie', 'sint-ceciliafeest-leden', 'concert-in-de-kerk', 'etentje', 'kerstconcert', 'lenteconcert']);

  const repetitie = find(me, 'repetitie');
  assert.deepEqual(repetitie, {
    id: 'repetitie', title: 'Repetitie', start: day(-10, 20).toISOString(), end: day(-10, 22).toISOString(),
    location: 'Repetitielokaal', locationUrl: '', info: repetitie.info, infoEn: '<span style="">Meet 30 minutes early.</span>', answer: 'X', closed: true
  });
  assert.match(repetitie.info, /<span style="font-weight: 900; ">uniform<\/span>/);
  assert.match(repetitie.info, /<a href="https:\/\/example.com\/partituren">/);
  assert.equal(find(me, 'sint-ceciliafeest-leden').title, 'Sint-Ceciliafeest (leden)', 'line break in the column title is ignored');
  assert.equal(find(me, 'sint-ceciliafeest-leden').answer, 'O?');
  assert.equal(find(me, 'etentje').answer, 'O');
  assert.equal(find(me, 'lenteconcert').start, null);
});

test('GET /me: "Op LedenActiviteiten" works as an access list', () => {
  const { backend, as, activitiesSheet } = setup();
  const piet = as('piet@example.com');

  activitiesSheet.set('F' + rowOf('Etentje'), false);
  assert.equal(ids(piet.get('me').data.activities).includes('etentje'), false, 'unticked: hidden');
  assert.equal(errorCode(piet.post('attendance', { id: 'etentje', answer: 'X' })), 'NOT_FOUND', 'unticked: cannot be answered');

  activitiesSheet.set('A' + rowOf('Kerstconcert'), 'Kerstconcert 2026');
  assert.equal(ids(piet.get('me').data.activities).includes('kerstconcert'), false, 'title no longer matches: hidden');

  assert.equal(errorCode(piet.post('attendance', { id: 'oud-concert', answer: 'X' })), 'NOT_FOUND', 'not in Activiteiten: cannot be answered');
  assert.deepEqual({ ...backend.call('hiddenColumns') }, { filterActive: true, hidden: ['Kerstconcert (not in Activiteiten)', 'Etentje (not ticked)', 'Oud concert (not in Activiteiten)'] });
});

test('GET /me: without the column "Op LedenActiviteiten" every column stays visible', () => {
  const { as, activitiesSheet } = setup();
  activitiesSheet.set('F2', 'Iets anders');
  const piet = as('piet@example.com');
  assert.equal(piet.get('me').data.activities.length, 7);
  assert.equal(piet.post('attendance', { id: 'oud-concert', answer: 'X' }).ok, true);
});

test('email address is compared case-insensitively', () => {
  const { as } = setup();
  const me = as('AN@example.COM').get('me').data;
  assert.equal(me.email, 'an@example.com');
  assert.equal(me.readOnly, true);
});

test('anyone not on the list gets NOT_A_MEMBER', () => {
  const { as } = setup();
  assert.equal(errorCode(as('vreemde@example.com').get('me')), 'NOT_A_MEMBER');
  assert.equal(errorCode(as('vreemde@example.com').post('attendance', { id: 'concert-in-de-kerk', answer: 'X' })), 'NOT_A_MEMBER');
});

test('POST /attendance writes the answer in the right column and returns the new score', () => {
  const { backend, as } = setup();
  const piet = as('piet@example.com');
  const response = piet.post('attendance', { id: 'concert-in-de-kerk', answer: 'X' });
  assert.deepEqual(response, { ok: true, data: { answer: 'X', score: { score: 2, total: 7, background: '#ff0000' } } });
  assert.equal(backend.spreadsheet.getSheetByName('Activiteiten 2026').getRange('E5').getValue(), 'X');

  assert.equal(piet.post('attendance', { id: 'sint-ceciliafeest-leden', answer: 'X' }).data.score.score, 3);
  assert.equal(piet.post('attendance', { id: 'kerstconcert', answer: 'X' }).data.score.background, '#ff9900');
  assert.equal(find(piet.get('me').data, 'sint-ceciliafeest-leden').answer, 'X');
});

test('POST /attendance only changes the own row', () => {
  const { as } = setup();
  as('piet@example.com').post('attendance', { id: 'lenteconcert', answer: 'O' });
  assert.equal(find(as('jan@example.com').get('me').data, 'lenteconcert').answer, '');
  assert.equal(find(as('piet@example.com').get('me').data, 'lenteconcert').answer, 'O');
});

test('POST /attendance validates the input', () => {
  const { as } = setup();
  const piet = as('piet@example.com');
  assert.equal(errorCode(piet.post('attendance', { id: 'concert-in-de-kerk', answer: 'JA' })), 'BAD_REQUEST');
  assert.equal(errorCode(piet.post('attendance', { id: 'concert-in-de-kerk' })), 'BAD_REQUEST');
  assert.equal(errorCode(piet.post('attendance', { id: 'nieuwjaarsreceptie', answer: 'X' })), 'NOT_FOUND', 'no column in the attendance sheet');
  assert.equal(errorCode(piet.post('attendance', { id: 'kolom-10', answer: 'X' })), 'NOT_FOUND');
  assert.equal(errorCode(piet.post('attendance', { event: 'Concert in de kerk', answer: 'X' })), 'NOT_FOUND', 'old way, by title');
  assert.equal(errorCode(piet.post('attendance', 'geen json')), 'BAD_REQUEST');
  assert.equal(errorCode(piet.post('attendance', '[1,2]')), 'BAD_REQUEST');
});

test('POST /attendance rejects closed activity, read-only and "-"', () => {
  const { as } = setup();
  assert.equal(errorCode(as('piet@example.com').post('attendance', { id: 'repetitie', answer: 'O' })), 'FORBIDDEN', 'closed');
  assert.equal(errorCode(as('an@example.com').post('attendance', { id: 'concert-in-de-kerk', answer: 'O' })), 'FORBIDDEN', 'read-only');
  assert.equal(errorCode(as('jan@example.com').post('attendance', { id: 'kerstconcert', answer: 'X' })), 'FORBIDDEN', '"-"');
});

test('POST /registrations mails the secretariat, at most once per 6 hours', () => {
  const { backend, as } = setup();
  const nieuw = as('nieuw@example.com');
  assert.deepEqual(nieuw.post('registrations', { name: 'Nieuw Lid' }), { ok: true, data: { sent: true } });
  assert.deepEqual(nieuw.post('registrations', { name: 'Nieuw Lid' }), { ok: true, data: { sent: false } });
  assert.equal(backend.outbox.length, 1);
  assert.equal(backend.outbox[0].to, 'secretariaat@example.com');
  assert.match(backend.outbox[0].body, /Nieuw Lid heeft een nieuw account gemaakt/);
  assert.equal(errorCode(nieuw.post('registrations', { name: '  ' })), 'BAD_REQUEST');
});

test('location: link on the cell is passed on (only http/https), otherwise empty', () => {
  const { backend, as, activitiesSheet } = setup();
  const pub = backend.request('GET', 'public/activities').body.data.activities;
  assert.equal(pub.find(a => a.id === 'concert-in-de-kerk').locationUrl, 'https://maps.app.goo.gl/kerkSteenbrugge');
  assert.equal(pub.find(a => a.id === 'kerstconcert').locationUrl, '');
  assert.equal(find(as('piet@example.com').get('me').data, 'concert-in-de-kerk').locationUrl, 'https://maps.app.goo.gl/kerkSteenbrugge');

  const row = rowOf('Kerstconcert');
  activitiesSheet.set('D' + row, 'Kerk', { rich: [{ text: 'Kerk', link: 'javascript:alert(1)' }] });
  backend.cache.clear();
  const again = backend.request('GET', 'public/activities').body.data.activities;
  assert.equal(again.find(a => a.id === 'kerstconcert').locationUrl, '');
});

test('html in a cell is escaped', () => {
  const { as, activitiesSheet } = setup();
  activitiesSheet.set('H' + rowOf('Concert in de kerk'), '', { rich: [{ text: '<img src=x onerror=alert(1)>' }] });
  assert.equal(find(as('piet@example.com').get('me').data, 'concert-in-de-kerk').info, '<span style="">&lt;img src=x onerror=alert(1)&gt;</span>');
});

test('columns of Activiteiten may be in a different order', () => {
  const { backend, activitiesSheet } = setup();
  // Swap the positions of title and location
  for (let row = 2; row <= ACTIVITIES.length + 2; row++) {
    const title = activitiesSheet.read(row, 1);
    activitiesSheet.set('A' + row, activitiesSheet.read(row, 4)).set('D' + row, title);
  }
  const concert = backend.request('GET', 'public/activities').body.data.activities[0];
  assert.equal(concert.title, 'Concert in de kerk');
  assert.equal(concert.location, 'Kerk Steenbrugge');
});

//
// agenda status in the sheet
//
test('onActivitiesEdit shows what the next sync will do', () => {
  const { backend, activitiesSheet } = setup();
  const row = ACTIVITIES.length + 3;
  activitiesSheet.set('A' + row, 'Ledenfeest').set('B' + row, day(30, 19));
  backend.call('onActivitiesEdit', { range: activitiesSheet.getRange('B' + row) });
  assert.equal(activitiesSheet.read(row, 10), 'Klaar om te plannen');

  activitiesSheet.set('A' + (row + 1), 'Zonder datum');
  backend.call('onActivitiesEdit', { range: activitiesSheet.getRange('A' + (row + 1)) });
  assert.equal(activitiesSheet.read(row + 1, 10), 'Nog te plannen');

  // a change in another tab does nothing
  backend.call('onActivitiesEdit', { range: backend.spreadsheet.getSheetByName('settings').getRange('B2') });
});

//
// member calendar
//
test('syncAgenda puts every activity with a date in the calendar, once', () => {
  const { backend, activitiesSheet } = setup();
  const result = backend.call('syncAgenda');
  assert.deepEqual({ ...result }, { created: 8, updated: 0, deleted: 0 }, 'everything with a date, the board meeting too');

  const events = backend.calendar.getEvents(day(-400, 0), day(400, 0));
  const concert = events.find(e => e.getTag('activiteit') === 'Concert in de kerk');
  assert.equal(concert.getTitle(), 'Concert in de kerk');
  assert.equal(concert.getStartTime().getTime(), day(10, 19, 30).getTime());
  assert.equal(concert.getEndTime().getTime(), day(10, 21, 30).getTime());
  assert.equal(concert.getLocation(), 'Kerk Steenbrugge');
  assert.ok(events.some(e => e.getTag('activiteit') === 'Bestuursvergadering'), 'board meeting is in it, even without Op LedenActiviteiten');

  const row = rowOf('Concert in de kerk');
  assert.equal(activitiesSheet.read(row, 9), concert.getId());
  assert.equal(activitiesSheet.read(row, 10), 'Gepland');
  assert.ok(activitiesSheet.read(row, 11));
  assert.equal(activitiesSheet.read(rowOf('Lenteconcert'), 10), 'Nog te plannen');
  assert.equal(activitiesSheet.read(rowOf('Lenteconcert'), 9), '');

  assert.deepEqual({ ...backend.call('syncAgenda') }, { created: 0, updated: 0, deleted: 0 }, 'nothing the second time');
  assert.equal(backend.calendar.events.size, 8);
});

test('syncAgenda updates, reschedules and cleans up', () => {
  const { backend, activitiesSheet } = setup();
  backend.call('syncAgenda');
  const concertRow = rowOf('Concert in de kerk');
  const concertId = activitiesSheet.read(concertRow, 9);

  // time changed: the same event is updated
  activitiesSheet.set('B' + concertRow, day(11, 20));
  backend.call('onActivitiesEdit', { range: activitiesSheet.getRange('B' + concertRow) });
  assert.equal(activitiesSheet.read(concertRow, 10), 'Gewijzigd');
  assert.deepEqual({ ...backend.call('syncAgenda') }, { created: 0, updated: 1, deleted: 0 });
  assert.equal(backend.calendar.getEventById(concertId).getStartTime().getTime(), day(11, 20).getTime());
  assert.equal(backend.calendar.getEventById(concertId).getEndTime().getTime(), day(11, 21, 30).getTime());

  // date cleared: event gone, status reset
  activitiesSheet.set('B' + rowOf('Etentje'), '');
  assert.equal(backend.call('syncAgenda').deleted, 1);
  assert.equal(activitiesSheet.read(rowOf('Etentje'), 10), 'Nog te plannen');
  assert.equal(activitiesSheet.read(rowOf('Etentje'), 9), '');

  // row gone: orphan event removed; manual event stays
  backend.calendar.createEvent('Handmatig', day(3, 10), day(3, 11));
  for (let col = 1; col <= 11; col++) activitiesSheet.set(column(col) + rowOf('Bestuursvergadering'), '');
  assert.equal(backend.call('syncAgenda').deleted, 1);
  assert.ok(backend.calendar.getEvents(day(-400, 0), day(400, 0)).some(e => e.getTitle() === 'Handmatig'));

  // event deleted in the calendar itself: recreated
  backend.calendar.getEventById(concertId).deleteEvent();
  assert.equal(backend.call('syncAgenda').created, 1);
  assert.notEqual(activitiesSheet.read(concertRow, 9), concertId);
});

test('syncAgenda clearly reports what is missing', () => {
  const { backend, activitiesSheet } = setup();
  backend.calendar.id = 'een-andere-agenda';
  assert.throws(() => backend.call('syncAgenda'), /Agenda niet gevonden/);

  backend.calendar.id = PROPERTIES.CALENDAR_ID;
  activitiesSheet.set('I2', 'Iets anders');
  assert.throws(() => backend.call('syncAgenda'), /Kolom 'Agenda-ID' ontbreekt/);
});

//
// settings and transition
//
test('settings from the settings tab take precedence over Script Properties', () => {
  const { backend, as } = setup();
  const settings = backend.spreadsheet.getSheetByName('settings');
  settings.set('E20', 'Agenda-link').set('F20', 'https://calendar.google.com/calendar/ical/ander/basic.ics');
  settings.set('E21', 'Mail nieuwe accounts').set('F21', 'nieuw-secretariaat@example.com');
  settings.set('E22', 'Agenda-ID').set('F22', 'een-andere-agenda');

  assert.equal(as('piet@example.com').get('me').data.calendarUrl, 'https://calendar.google.com/calendar/ical/ander/basic.ics');
  as('nieuw@example.com').post('registrations', { name: 'X' });
  assert.equal(backend.outbox[0].to, 'nieuw-secretariaat@example.com');
  assert.throws(() => backend.call('syncAgenda'), /Agenda niet gevonden, controleer 'Agenda-ID'/);

  // cleared: back to the Script Property
  settings.set('F20', '');
  assert.equal(as('piet@example.com').get('me').data.calendarUrl, PROPERTIES.AGENDA_ICAL_URL);
});

test('without setting and without Script Property: clear error', () => {
  const { CALENDAR_ID, NOTIFY_EMAIL, AGENDA_ICAL_URL, ...rest } = PROPERTIES;
  const { backend, as } = setup(rest);
  assert.throws(() => backend.call('syncAgenda'), /Instelling 'Agenda-ID' ontbreekt in het tabblad settings/);
  assert.equal(as('piet@example.com').get('me').data.calendarUrl, null);
  assert.equal(errorCode(as('nieuw@example.com').post('registrations', { name: 'X' })), 'INTERNAL');
});

test('old Activiteiten tab (not yet set up): members page keeps working', () => {
  const { backend, as, activitiesSheet } = setup();
  // the old info tab: no column titles, text only
  activitiesSheet.cells.clear();
  activitiesSheet.set('B3', 'oude info');

  const me = as('piet@example.com').get('me');
  assert.equal(me.ok, true);
  assert.equal(me.data.activities.length, 7, 'all columns stay visible');
  assert.ok(me.data.activities.every(a => a.start === null));
  assert.ok(me.data.activities.some(a => a.title === 'Oud concert'));
  assert.equal(as('piet@example.com').post('attendance', { id: 'oud-concert', answer: 'X' }).ok, true);

  const pub = backend.request('GET', 'public/activities').body;
  assert.equal(errorCode(pub), 'INTERNAL');
  assert.match(pub.error.message, /Activiteiten is not set up yet, missing: column 'Titel', column 'Start'/);
  assert.throws(() => backend.call('syncAgenda'), /not set up yet/);
  backend.call('onActivitiesEdit', { range: activitiesSheet.getRange('B3') });
});

//
// local server
//
test('local server: CORS header, no preflight, public route', async t => {
  const { backend } = setup();
  const server = createServer({ backend });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());
  const base = `http://127.0.0.1:${server.address().port}`;

  const health = await fetch(base + '/exec/health');
  assert.equal(health.headers.get('access-control-allow-origin'), '*');
  assert.equal((await health.json()).ok, true);
  assert.equal((await (await fetch(base + '/exec/public/activities')).json()).data.activities.length, 4);

  const post = await fetch(base + '/exec/attendance?idToken=dev:piet@example.com', { method: 'POST', body: JSON.stringify({ id: 'concert-in-de-kerk', answer: 'O' }) });
  assert.equal((await post.json()).data.answer, 'O');

  assert.equal((await fetch(base + '/exec/me', { method: 'OPTIONS' })).status, 405);
  assert.equal((await fetch(base + '/andere')).status, 404);
});

function column(n) {
  let letters = '';
  for (; n > 0; n = Math.floor((n - 1) / 26)) letters = String.fromCharCode(65 + (n - 1) % 26) + letters;
  return letters;
}
