//
// orchestra layout: a link to the orchestra mapper behind every activity title in the attendance sheet,
// with the members who answered X or X? on the right place
// layout in the settings tab: a cell "Opstelling", under it one stage row per row (front first),
// instruments from left to right, e.g.
//   Opstelling
//   clarinet    flute
//   euphonium   trumpet   horn
// the names are the image names of the mapper (figs/<name>.png) and the instruments in the member list
//

const ORCHESTRA_MAPPER_URL = 'https://mattigoofy.github.io/orchestraMapper/';
const ORCHESTRA_IMAGE_URL = 'https://raw.githubusercontent.com/mattigoofy/orchestraMapper/main/figs/';
const PRESENT_ANSWERS = ['X', 'X?'];

//
// the layout block in the settings tab: [['clarinet', 'flute'], ['euphonium', 'trumpet', 'horn']]
//
function readOrchestraLayout() {
  const rows = setting.settingsSheet.getDataRange().getValues();
  for (let r = 0; r < rows.length; r++) {
    const c = rows[r].findIndex(value => normalizeHeader(value) === 'opstelling');
    if (c === -1) continue;
    const layout = [];
    for (let i = r + 1; i < rows.length && String(rows[i][c]).trim(); i++) {
      const instruments = [];
      for (let j = c; j < rows[i].length && String(rows[i][j]).trim(); j++) instruments.push(normalizeHeader(rows[i][j]));
      layout.push(instruments);
    }
    return layout;
  }
  return [];
}

//
// mapper url for one activity; members: [{ name, instrument }] of the people present, in the order of the member list
//
function orchestraUrl(layout, title, date, members) {
  const sections = [];
  layout.forEach((instruments, row) => {
    instruments.forEach((instrument, i) => {
      // the mapper fills a row from the right: reverse, so left in the settings is left in the image
      const names = members.filter(m => m.instrument === instrument).map(m => m.name).reverse();
      if (names.length) sections.push({ name: instrument, color: '#000000', row: row + 1, start_index: instruments.length - 1 - i, names: names });
    });
  });

  const config = {
    font_size: 15,
    icon_size: 400,
    title: title,
    use_images: true,
    image_url: ORCHESTRA_IMAGE_URL,
    show_labels: false,
    show_row_count: false,
    invert: false,
    date: date,
    conductor: { name: getSetting('Dirigent', 'CONDUCTOR') || '', color: '#8b4513', image: 'conductor.png' },
    sections: sections
  };
  return ORCHESTRA_MAPPER_URL + '?compress=' + encodeURIComponent(JSON.stringify(config)) + '&view=1';
}

//
// put the link behind the activity titles: all, or only the columns firstColumn..lastColumn
// member list: email, instrument and name next to each other
//
function updateOrchestraLinks(firstColumn, lastColumn) {
  const layout = readOrchestraLayout();
  if (!layout.length) throw new Error("No layout: put the cell 'Opstelling' with the rows under it in the settings tab");
  const count = setting.endHeaderColRel;
  const rows = setting.endEmailRowRel;
  if (!count || !rows) return;

  const columns = readAllEventColumns(readActivities()).filter(c => !firstColumn || (c.column >= firstColumn && c.column <= lastColumn));
  if (!columns.length) return;

  const members = aanwezighedenSheet.getRange(setting.startEmailRow, setting.emailCol, rows, 3).getValues()
    .map(row => ({ name: String(row[2]).trim(), instrument: normalizeHeader(row[1]) }));
  const answers = aanwezighedenSheet.getRange(setting.startEmailRow, setting.startHeaderCol, rows, count).getValues();
  const titles = aanwezighedenSheet.getRange(setting.headerRow, setting.startHeaderCol, 1, count).getDisplayValues()[0];

  const links = columns.map(column => {
    const i = column.column - setting.startHeaderCol;
    const present = members.filter((m, r) => m.name && PRESENT_ANSWERS.indexOf(String(answers[r][i]).trim().toUpperCase()) !== -1);
    const start = column.activity && column.activity.start;
    const date = start ? start.getDate() + '/' + (start.getMonth() + 1) + '/' + start.getFullYear() : '';
    const url = orchestraUrl(layout, column.title.replace(/\s+/g, ' '), date, present);
    return SpreadsheetApp.newRichTextValue().setText(titles[i]).setLinkUrl(url).build();
  });
  // the columns are next to each other: one write for all of them
  aanwezighedenSheet.getRange(setting.headerRow, columns[0].column, 1, links.length).setRichTextValues([links]);
}

//
// edit trigger: answer or title changed = only those columns; member list, settings or Activiteiten = all
//
function onOrchestraEdit(e) {
  const sheet = e.range.getSheet().getName();
  if (sheet === setting.settingsSheet.getName() || sheet === ACTIVITIES_SHEET) return updateOrchestraLinks();
  if (sheet !== setting.sheetName) return;
  // rows above the titles (closed, filter) do not change the layout
  if (e.range.getRow() + e.range.getNumRows() - 1 < setting.headerRow) return;

  const first = e.range.getColumn();
  if (first >= setting.startHeaderCol) return updateOrchestraLinks(first, first + e.range.getNumColumns() - 1);
  updateOrchestraLinks();
}

//
// run once from the editor: recalculate the links on every change; replaces its own trigger, so no doubles
//
function createOrchestraTrigger() {
  ScriptApp.getProjectTriggers()
    .filter(trigger => trigger.getHandlerFunction() === 'onOrchestraEdit')
    .forEach(trigger => ScriptApp.deleteTrigger(trigger));
  ScriptApp.newTrigger('onOrchestraEdit').forSpreadsheet(setting.ss).onEdit().create();
}
