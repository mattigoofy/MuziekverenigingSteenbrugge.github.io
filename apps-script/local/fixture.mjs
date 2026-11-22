// Example spreadsheet with the same structure as the real one (see Settings.js and Activiteiten.js).
// Dates are relative to today, so "upcoming" and "past" are always correct.
//
// settings              attendance sheet                              Activiteiten (source)
//   B2:C2 header  4,4     row 3: closed (J) per activity                 row 1: (free, like "Read Only")
//   B3:C3 data    5,4     row 4: titles, same as Activiteiten            row 2: column titles
//   B4:C4 email   5,1     row 5..: A=email B=instrument C=name D..J      row 3..: one activity per row
//   B5:C5 closed  3,4     L=score M=total O=read only (J)
//   B6:C6 filter  2,2     B2 = ReadOnlyToggle (named range), L3 filter text, M3 hide closed (Filter.js)
//   F2 sheet name, H2.. mails for the backup

import { Spreadsheet } from './gas.mjs';

// date <offset> days from today, at hh:mm local time
export function day(offset, hours, minutes = 0) {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, hours, minutes);
}

export const ACTIVITY_HEADER_ROW = 2;
export const ACTIVITY_HEADERS = ['Titel', 'Start', 'Eind', 'Locatie', 'Op website', 'Op LedenActiviteiten',
  'Beschrijving website', 'Beschrijving LedenActiviteiten', 'Agenda-ID', 'Agenda-status', 'Agenda-vingerafdruk',
  'Beschrijving website EN', 'Beschrijving LedenActiviteiten EN'];

const INFO = [
  { text: 'Afspraak 30 minuten vooraf.\nMeebrengen: ' },
  { text: 'uniform', bold: true },
  { text: ' en ' },
  { text: 'partituren', link: 'https://example.com/partituren', underline: true },
  { text: '.' }
];

export const ACTIVITIES = [
  { title: 'Repetitie', start: day(-10, 20), end: '22:00', location: 'Repetitielokaal', website: false, leden: true, infoEn: 'Meet 30 minutes early.' },
  { title: 'Concert in de kerk', start: day(10, 19, 30), end: '21:30', location: 'Kerk Steenbrugge', locationLink: 'https://maps.app.goo.gl/kerkSteenbrugge', website: true, leden: true, web: 'Gratis toegang, vrije bijdrage.', webEn: 'Free entry, donations welcome.' },
  { title: 'Kerstconcert', start: day(40, 19, 30), end: '', location: 'Kerk Steenbrugge', website: true, leden: true, web: 'Iedereen welkom.' },
  { title: 'Nieuwjaarsreceptie', start: day(60, 11), end: '13:00', location: 'Gemeentehuis', website: true, leden: true, web: 'Korte set, daarna receptie.' },
  { title: 'Etentje', start: day(20, 19), end: '23:30', location: 'Feestzaal', website: false, leden: true },
  { title: 'Bestuursvergadering', start: day(15, 20), end: '22:00', location: 'Café De Linde', website: false, leden: false },
  { title: 'Lenteconcert', start: '', end: '', location: '', website: true, leden: true, web: 'Datum volgt.' },
  { title: 'Sint-Ceciliafeest (leden)', start: day(5, 18, 30), end: '', location: 'Feestzaal', website: false, leden: true },
  { title: 'Zomerconcert', start: day(-30, 20), end: '22:00', location: 'Park', website: true, leden: false, web: 'Openluchtconcert.' }
];

// columns of the attendance sheet: same title as in Activiteiten (line breaks allowed),
// "Oud concert" does not exist in Activiteiten
export const EVENT_COLUMNS = ['Repetitie', 'Concert in de kerk', 'Kerstconcert', 'Sint-Ceciliafeest\n(leden)', 'Etentje', 'Lenteconcert', 'Oud concert'];

export const MEMBERS = [
  { email: 'piet@example.com', name: 'Piet Peeters', instrument: 'Trompet', answers: ['X', 'X?', '?', 'O?', 'O', '', ''] },
  { email: 'An@Example.com', name: 'An Janssens', instrument: 'Klarinet', answers: ['X', 'X', 'X', 'X', '', '', ''], readOnly: true },
  { email: 'jan@example.com', name: 'Jan De Smet', instrument: 'Tuba', answers: ['X', '', '-', '', '', '', ''] }
];

const FIRST_EVENT_COL = 4;
const FIRST_MEMBER_ROW = 5;
const SCORE_COL = FIRST_EVENT_COL + EVENT_COLUMNS.length + 1;
export const FILTER_TEXT_COL = FIRST_EVENT_COL + EVENT_COLUMNS.length + 1;

export function column(n) {
  let letters = '';
  for (; n > 0; n = Math.floor((n - 1) / 26)) letters = String.fromCharCode(65 + (n - 1) % 26) + letters;
  return letters;
}

// extraEmails: additional members, e.g. your own Firebase account to log in locally
export function createFixture({ extraEmails = [] } = {}) {
  const ss = new Spreadsheet('local-fixture');
  const title = 'Activiteiten 2026';

  const settings = ss.addSheet('settings');
  settings.set('B2', 4).set('C2', FIRST_EVENT_COL)
    .set('B3', FIRST_MEMBER_ROW).set('C3', FIRST_EVENT_COL)
    .set('B4', FIRST_MEMBER_ROW).set('C4', 1)
    .set('B5', 3).set('C5', FIRST_EVENT_COL)
    .set('B6', 2).set('C6', 2)
    .set('B10', 3).set('C10', 2)
    .set('F2', title).set('F8', 'Activiteiten')
    .set('H1', 'Mails voor updates').set('H2', 'secretaris@example.com');

  // source: row 1 free (like in the real sheet), column titles in row 2
  const activities = ss.addSheet('Activiteiten');
  activities.set('J1', 'Read Only');
  ACTIVITY_HEADERS.forEach((header, i) => activities.set(column(i + 1) + ACTIVITY_HEADER_ROW, header));
  ACTIVITIES.forEach((a, i) => {
    const row = ACTIVITY_HEADER_ROW + 1 + i;
    activities.set('A' + row, a.title).set('B' + row, a.start).set('C' + row, a.end)
      .set('D' + row, a.location, a.locationLink ? { rich: [{ text: a.location, link: a.locationLink }] } : {}).set('E' + row, a.website).set('F' + row, a.leden)
      .set('G' + row, a.web || '').set('H' + row, a.leden ? 'Info' : '', a.leden ? { rich: INFO } : {})
      .set('L' + row, a.webEn || '').set('M' + row, a.infoEn || '');
  });

  // attendance
  const sheet = ss.addSheet(title);
  EVENT_COLUMNS.forEach((name, i) => {
    sheet.set(column(FIRST_EVENT_COL + i) + '4', name);
    sheet.set(column(FIRST_EVENT_COL + i) + '3', i === 0 ? 'J' : 'N');
  });

  const members = [
    ...MEMBERS,
    ...extraEmails.map(email => ({ email, name: email.split('@')[0], instrument: 'Lokaal', answers: EVENT_COLUMNS.map((_, i) => i === 0 ? 'X' : '') }))
  ];
  members.forEach((member, m) => {
    const row = FIRST_MEMBER_ROW + m;
    const answers = s => EVENT_COLUMNS.map((_, i) => s.read(row, FIRST_EVENT_COL + i));
    const score = s => answers(s).filter(a => a === 'X').length;
    const total = s => answers(s).filter(a => a !== '-').length;

    sheet.set('A' + row, member.email).set('B' + row, member.instrument).set('C' + row, member.name);
    member.answers.forEach((answer, i) => sheet.set(column(FIRST_EVENT_COL + i) + row, answer));
    sheet.set(column(SCORE_COL) + row, score, {
      background: s => score(s) / total(s) >= 0.75 ? '#00ff00' : score(s) / total(s) >= 0.5 ? '#ff9900' : '#ff0000'
    });
    sheet.set(column(SCORE_COL + 1) + row, total);
    sheet.set(column(SCORE_COL + 3) + row, member.readOnly ? 'J' : 'N');
  });

  // filter controls (Filter.js): toggle as named range "ReadOnlyToggle", and in the row above the titles,
  // one column after the last activity + 1: the filter text, then "hide closed activities"
  sheet.set('B2', false);
  ss.setNamedRange('ReadOnlyToggle', sheet.getRange('B2'));
  sheet.set(column(FILTER_TEXT_COL) + '3', '').set(column(FILTER_TEXT_COL + 1) + '3', false);

  ss.addSheet('Backup');
  ss.addSheet('Logboek');
  return ss;
}
