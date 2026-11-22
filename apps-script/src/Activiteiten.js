//
// tab "Activiteiten": the source of all activities
// - columns are found by their title, in the first row (of the first 5) that contains "Titel"
// - a column of the attendance sheet belongs to the activity with exactly the same title
//   (case, line breaks and double spaces are ignored)
// - "Op LedenActiviteiten" decides which of those columns members see and may answer (readEventColumns)
//

const ACTIVITIES_SHEET = 'Activiteiten';

const COLUMN_TITLES = {
  title: 'Titel',
  start: 'Start',
  end: 'Eind',
  location: 'Locatie',
  website: 'Op website',
  members: 'Op LedenActiviteiten',
  descriptionWebsite: 'Beschrijving website',
  descriptionMembers: 'Beschrijving LedenActiviteiten',
  // optional English descriptions; empty = the page falls back to the Dutch one
  descriptionWebsiteEn: 'Beschrijving website EN',
  descriptionMembersEn: 'Beschrijving LedenActiviteiten EN',
  agendaId: 'Agenda-ID',
  agendaStatus: 'Agenda-status',
  agendaFingerprint: 'Agenda-vingerafdruk'
};

const REQUIRED_COLUMNS = ['title', 'start'];
const DEFAULT_DURATION_MS = 2 * 60 * 60 * 1000;
const HEADER_SEARCH_ROWS = 5;

function normalizeHeader(text) {
  return String(text).trim().toLowerCase();
}

// compare titles ignoring case, line breaks and double spaces
function normalizeTitle(text) {
  return String(text).replace(/\s+/g, ' ').trim().toLowerCase();
}

// key for the API, derived from the title: "Zo 26/4 15h00 Burg (zit)" -> "zo-26-4-15h00-burg-zit"
function titleKey(text) {
  return normalizeTitle(text).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function isDate(value) {
  return Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime());
}

function isChecked(value) {
  return value === true || /^(true|waar|ja|j|x|1)$/i.test(String(value).trim());
}

//
// eind: a full date, only a time ("22:00", then on the day of the start) or empty (start + 2 hours)
//
function activityEnd(start, endValue, endDisplay) {
  if (!start) return null;
  const time = /^\s*(\d{1,2})[:u.h](\d{2})/.exec(endDisplay || '');
  if (isDate(endValue) && endValue.getFullYear() >= 1900) {
    if (endValue > start) return endValue;
  } else if (time) {
    const end = new Date(start.getTime());
    end.setHours(Number(time[1]), Number(time[2]), 0, 0);
    if (end <= start) end.setDate(end.getDate() + 1);
    return end;
  }
  return new Date(start.getTime() + DEFAULT_DURATION_MS);
}

//
// read all activities; also returns the sheet and the column numbers for anyone who wants to write
// missing: what is absent (tab or columns); the members page then continues with only the attendance sheet,
// the public list and the agenda sync report it (requireActivities)
//
function readActivities() {
  const sheet = setting.ss.getSheetByName(ACTIVITIES_SHEET);
  if (!sheet) return { sheet: null, columns: {}, activities: [], missing: ["tab '" + ACTIVITIES_SHEET + "'"] };

  const lastRow = sheet.getLastRow();
  const lastColumn = Math.max(1, sheet.getLastColumn());
  const top = sheet.getRange(1, 1, Math.max(1, Math.min(HEADER_SEARCH_ROWS, lastRow)), lastColumn).getValues();
  const headerIndex = top.findIndex(row => row.map(normalizeHeader).indexOf(normalizeHeader(COLUMN_TITLES.title)) !== -1);
  const header = (headerIndex === -1 ? [] : top[headerIndex]).map(normalizeHeader);
  const headerRow = headerIndex + 1;

  const columns = {};
  Object.keys(COLUMN_TITLES).forEach(key => {
    const index = header.indexOf(normalizeHeader(COLUMN_TITLES[key]));
    columns[key] = index === -1 ? null : index + 1;
  });
  const missing = REQUIRED_COLUMNS.filter(key => !columns[key]).map(key => "column '" + COLUMN_TITLES[key] + "'");
  if (missing.length) return { sheet: sheet, columns: columns, activities: [], missing: missing };
  if (lastRow <= headerRow) return { sheet: sheet, columns: columns, activities: [], missing: [] };

  const firstRow = headerRow + 1;
  const rows = lastRow - headerRow;
  const values = sheet.getRange(firstRow, 1, rows, lastColumn).getValues();
  const display = sheet.getRange(firstRow, 1, rows, lastColumn).getDisplayValues();
  const richColumn = column => column ? sheet.getRange(firstRow, column, rows, 1).getRichTextValues().map(cell => richTextValueToHtml(cell[0])) : [];
  const websiteHtml = richColumn(columns.descriptionWebsite);
  const membersHtml = richColumn(columns.descriptionMembers);
  const websiteEnHtml = richColumn(columns.descriptionWebsiteEn);
  const membersEnHtml = richColumn(columns.descriptionMembersEn);
  const cell = (row, key) => columns[key] ? row[columns[key] - 1] : '';

  const activities = values.map((row, i) => {
    const start = isDate(cell(row, 'start')) ? cell(row, 'start') : null;
    const title = String(cell(row, 'title')).trim();
    return {
      row: firstRow + i,
      key: titleKey(title),
      title: title,
      start: start,
      end: activityEnd(start, cell(row, 'end'), columns.end ? display[i][columns.end - 1] : ''),
      location: String(cell(row, 'location')).trim(),
      website: isChecked(cell(row, 'website')),
      members: isChecked(cell(row, 'members')),
      descriptionWebsite: websiteHtml[i] || '',
      descriptionMembers: membersHtml[i] || '',
      descriptionWebsiteEn: websiteEnHtml[i] || '',
      descriptionMembersEn: membersEnHtml[i] || '',
      descriptionText: String(cell(row, 'descriptionMembers') || cell(row, 'descriptionWebsite')).trim(),
      agendaId: String(cell(row, 'agendaId')).trim(),
      agendaFingerprint: String(cell(row, 'agendaFingerprint')).trim()
    };
  }).filter(activity => activity.title);

  return { sheet: sheet, columns: columns, activities: activities, missing: [] };
}

function requireActivities() {
  const result = readActivities();
  if (result.missing.length) throw new ApiError('INTERNAL', ACTIVITIES_SHEET + ' is not set up yet, missing: ' + result.missing.join(', '));
  return result;
}

// by date first, activities without a date last
function compareByStart(a, b) {
  if (a.start && b.start) return a.start - b.start;
  return a.start ? -1 : b.start ? 1 : 0;
}

//
// all columns of the attendance sheet, each with the activity of the same title (or null)
//
function readAllEventColumns(source) {
  const count = setting.endHeaderColRel;
  if (!count) return [];

  const byTitle = {};
  source.activities.forEach(activity => {
    const title = normalizeTitle(activity.title);
    if (!byTitle[title]) byTitle[title] = activity;
  });

  const titles = aanwezighedenSheet.getRange(setting.headerRow, setting.startHeaderCol, 1, count).getDisplayValues()[0];
  const closed = getDisabledEvents();

  return titles.map((title, i) => {
    const column = setting.startHeaderCol + i;
    const activity = byTitle[normalizeTitle(title)] || null;
    return {
      column: column,
      key: titleKey(title) || 'column-' + column,
      title: activity ? activity.title : title,
      activity: activity,
      closed: closed[i]
    };
  });
}

// "Op LedenActiviteiten" works as an access list, but only once Activiteiten is set up with that column;
// before that every column stays visible, so the members page does not go blank
function membersFilterActive(source) {
  return !source.missing.length && !!source.columns.members;
}

function isVisibleForMembers(source, column) {
  return !membersFilterActive(source) || !!(column.activity && column.activity.members);
}

//
// the columns members may see and answer (GET /me and POST /attendance):
// only those with an activity in Activiteiten that has "Op LedenActiviteiten" ticked
//
function readEventColumns(source) {
  return readAllEventColumns(source).filter(column => isVisibleForMembers(source, column));
}

//
// run from the editor (or the local server at startup): which attendance columns members do not see, and why
//
function hiddenColumns() {
  const source = readActivities();
  if (!membersFilterActive(source)) return { filterActive: false, hidden: [] };
  const hidden = readAllEventColumns(source)
    .filter(column => !isVisibleForMembers(source, column))
    .map(column => column.title.replace(/\s+/g, ' ') + (column.activity ? ' (not ticked)' : ' (not in ' + ACTIVITIES_SHEET + ')'));
  console.log('Hidden on the members page: ' + (hidden.join(', ') || 'none'));
  return { filterActive: true, hidden: hidden };
}
