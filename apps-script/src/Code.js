//
// JSON API for the public activities page and the members page
// full description: api-docs/openapi.yaml
//
// every request goes to <web-app-url>/<path>, e.g. .../exec/me?idToken=...
// Apps Script cannot set HTTP status codes: every response is 200 with
//   { "ok": true, "data": ... }  or  { "ok": false, "error": { "code": ..., "message": ... } }
//

const ANSWERS = ['X', 'X?', '?', 'O?', 'O'];

const ROUTES = {
  'GET health': { auth: false, handler: getHealth },
  'GET public/activities': { auth: false, handler: getPublicActivities },
  'GET me': { auth: true, handler: getMe },
  'POST attendance': { auth: true, handler: postAttendance },
  // registering happens right after creating the account, before the address is confirmed
  'POST registrations': { auth: true, unverifiedAllowed: true, handler: postRegistration }
};

class ApiError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function doGet(e) {
  return handleRequest('GET', e);
}

function doPost(e) {
  return handleRequest('POST', e);
}

//
// look up the path, check the login and wrap the response in the fixed envelope
//
function handleRequest(method, e) {
  let result;
  try {
    const path = String(e.parameter.path || e.pathInfo || '').replace(/^\/+|\/+$/g, '');
    const route = ROUTES[method + ' ' + path];
    if (!route) throw new ApiError('NOT_FOUND', 'Unknown path: ' + method + ' /' + path);

    const user = route.auth ? verifyIdToken(e.parameter.idToken) : null;
    if (user && !user.verified && !route.unverifiedAllowed) {
      throw new ApiError('EMAIL_NOT_VERIFIED', 'Email address not verified yet (set the password via the link in the reset mail)');
    }
    result = { ok: true, data: route.handler(user, parseBody(e)) };
  }
  catch (err) {
    if (!(err instanceof ApiError)) {
      console.error(err);
      err = new ApiError('INTERNAL', 'Something went wrong on the server');
    }
    result = { ok: false, error: { code: err.code, message: err.message } };
  }
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

//
// read the body of a POST (JSON, sent as text/plain to avoid a CORS preflight)
//
function parseBody(e) {
  if (!e.postData || !e.postData.contents) return {};
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  }
  catch (err) {
    throw new ApiError('BAD_REQUEST', 'Body is not valid JSON');
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ApiError('BAD_REQUEST', 'Body must be a JSON object');
  return body;
}

//
// have Google verify the Firebase ID token; returns the email address of the logged-in user and whether
// that address is confirmed. Anyone can create a Firebase account with any address, so only a confirmed
// address proves who it is (setting the password via the reset mail confirms it).
// the result stays in the cache for 5 minutes so not every request costs an extra call
//
function verifyIdToken(idToken) {
  if (!idToken) throw new ApiError('UNAUTHENTICATED', 'Not logged in (idToken missing)');

  const cache = CacheService.getScriptCache();
  const cacheKey = 'idtoken_' + hash(idToken);
  const cached = cache.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const response = UrlFetchApp.fetch(
    'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + encodeURIComponent(getConfig('FIREBASE_API_KEY')),
    { method: 'post', contentType: 'application/json', payload: JSON.stringify({ idToken: idToken }), muteHttpExceptions: true }
  );
  if (response.getResponseCode() !== 200) throw new ApiError('UNAUTHENTICATED', 'Login invalid or expired');

  const account = (JSON.parse(response.getContentText()).users || [])[0];
  if (!account || !account.email) throw new ApiError('UNAUTHENTICATED', 'This account has no email address');

  const user = { email: normalizeEmail(account.email), verified: account.emailVerified === true };
  cache.put(cacheKey, JSON.stringify(user), 300);
  return user;
}

function hash(text) {
  return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text));
}

function normalizeEmail(email) {
  return String(email).trim().toLowerCase();
}


//
// GET /health: does the API work and can it read the spreadsheet
//
function getHealth() {
  return { status: 'ok', title: setting.sheetName };
}

//
// GET /public/activities: activities with "Op website", no login; cached for 10 minutes
// past (end in the past) is dropped, without a date stays ("datum volgt")
//
function getPublicActivities() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get('public_activities');
  if (cached) return JSON.parse(cached);

  const now = new Date();
  const data = {
    activities: requireActivities().activities
      .filter(a => a.website && a.title && (!a.end || a.end >= now))
      .sort(compareByStart)
      .map(a => ({
        id: a.key,
        title: a.title,
        start: a.start ? a.start.toISOString() : null,
        end: a.end ? a.end.toISOString() : null,
        location: a.location,
        locationUrl: a.locationUrl,
        description: a.descriptionWebsite,
        descriptionEn: a.descriptionWebsiteEn
      }))
  };
  cache.put('public_activities', JSON.stringify(data), 600);
  return data;
}

//
// GET /me: the activities of the attendance sheet with the answers of the logged-in user
//
function getMe(user) {
  const row = requireMemberRow(user.email);
  const count = setting.endHeaderColRel;
  const answers = count ? aanwezighedenSheet.getRange(row, setting.startHeaderCol, 1, count).getValues()[0] : [];

  const activities = readEventColumns(readActivities())
    .map(column => {
      const activity = column.activity;
      return {
        id: column.key,
        title: column.title,
        start: activity && activity.start ? activity.start.toISOString() : null,
        end: activity && activity.end ? activity.end.toISOString() : null,
        location: activity ? activity.location : '',
        locationUrl: activity ? activity.locationUrl : '',
        info: activity ? activity.descriptionMembers : '',
        infoEn: activity ? activity.descriptionMembersEn : '',
        answer: String(answers[column.column - setting.startHeaderCol]).toUpperCase(),
        closed: column.closed
      };
    })
    .sort((a, b) => compareByStart({ start: a.start && new Date(a.start) }, { start: b.start && new Date(b.start) }));

  return {
    email: user.email,
    title: setting.sheetName,
    activities: activities,
    readOnly: isReadOnly(row),
    score: getScore(row),
    calendarUrl: getSetting('Agenda-link', 'AGENDA_ICAL_URL')
  };
}

//
// POST /attendance: save the answer of the logged-in user for one activity
//
function postAttendance(user, body) {
  const answer = String(body.answer || '');
  if (ANSWERS.indexOf(answer) === -1) throw new ApiError('BAD_REQUEST', 'answer must be one of ' + ANSWERS.join(', '));

  const row = requireMemberRow(user.email);
  if (isReadOnly(row)) throw new ApiError('FORBIDDEN', 'Read-only: changes are disabled for this member');

  const column = readEventColumns(readActivities()).filter(c => c.key === String(body.id || ''))[0];
  if (!column) throw new ApiError('NOT_FOUND', 'Unknown activity');
  if (column.closed) throw new ApiError('FORBIDDEN', 'This activity is closed');

  const cell = aanwezighedenSheet.getRange(row, column.column);
  if (String(cell.getValue()) === '-') throw new ApiError('FORBIDDEN', 'This activity does not apply to this member');

  cell.setValue(answer);
  SpreadsheetApp.flush();
  // changes by a script do not fire the edit trigger: refresh the orchestra layout link of this column here
  try {
    updateOrchestraLinks(column.column, column.column);
  }
  catch (err) {
    console.warn('Orchestra layout not updated: ' + err.message);
  }
  return { answer: answer, score: getScore(row) };
}

//
// POST /registrations: notify the secretariat of a new account (max. 1 mail per 6 hours per address)
//
function postRegistration(user, body) {
  const name = String(body.name || '').trim();
  if (!name || name.length > 100) throw new ApiError('BAD_REQUEST', 'name is required (max. 100 characters)');

  const cache = CacheService.getScriptCache();
  const cacheKey = 'registration_' + hash(user.email);
  if (cache.get(cacheKey)) return { sent: false };

  MailApp.sendEmail(requireSetting('Mail nieuwe accounts', 'NOTIFY_EMAIL'), 'Nieuw lid', name + ' heeft een nieuw account gemaakt, voeg hem toe in de spreadsheet\nemailadres: ' + user.email);
  cache.put(cacheKey, '1', 21600);
  return { sent: true };
}


//
// helper functions for the spreadsheet
//
function requireMemberRow(email) {
  if (setting.endEmailRowRel > 0) {
    const emails = aanwezighedenSheet.getRange(setting.startEmailRow, setting.emailCol, setting.endEmailRowRel, 1).getValues().flat();
    const index = emails.map(normalizeEmail).indexOf(normalizeEmail(email));
    if (index !== -1) return index + setting.startEmailRow;
  }
  throw new ApiError('NOT_A_MEMBER', 'This email address is not on the member list');
}

function getDisabledEvents() {
  if (!setting.endHeaderColRel) return [];
  return aanwezighedenSheet.getRange(setting.disabledEventsRow, setting.startDisabledEventsCol, 1, setting.endHeaderColRel).getValues()[0].map(value => value == 'J');
}

function isReadOnly(row) {
  return aanwezighedenSheet.getRange(row, setting.endHeaderColAbs + 4).getValue() === 'J';
}

function getScore(row) {
  const scoreCell = aanwezighedenSheet.getRange(row, setting.endHeaderColAbs + 1);
  return {
    score: scoreCell.getValue(),
    total: aanwezighedenSheet.getRange(row, setting.endHeaderColAbs + 2).getValue(),
    background: scoreCell.getBackground()
  };
}

function escapeHtml(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

//
// convert formatted text from a cell to html
//
function richTextValueToHtml(richTextValue) {
  // empty cell: empty string, so the page can fall back to the other language
  if (!richTextValue || !richTextValue.getText().trim()) return '';
  let html = '';

  richTextValue.getRuns().forEach(function(run) {
    const style = run.getTextStyle();
    const linkUrl = run.getLinkUrl();
    const color = style.getForegroundColor();

    let css = '';
    if (style.isBold()) css += 'font-weight: 900; ';
    if (style.isItalic()) css += 'font-style: italic; ';
    if (style.isUnderline()) css += 'text-decoration: underline; ';
    // black is the default colour in Sheets; do not carry it over, otherwise the text is unreadable on a dark page
    if (color && color.toLowerCase() !== '#000000') css += 'color: ' + escapeHtml(color) + '; ';

    let span = '<span style="' + css + '">' + escapeHtml(run.getText()) + '</span>';
    if (linkUrl) span = '<a href="' + escapeHtml(linkUrl) + '">' + span + '</a>';
    html += span;
  });

  return html;
}
