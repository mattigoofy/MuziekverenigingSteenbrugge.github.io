//
// Column filter on the attendance sheet, for the secretary:
//   ReadOnlyToggle (named range)            filter on/off; off = every activity column visible
//   row above the titles, 1 column after    filter text: only columns whose title contains it
//   the last activity, and the cell next    checkbox: also hide closed activities (J in the closed row)
//   to it
// Runs from the installable trigger onFilterEdit (installFilterTriggers), or by hand via onChange.
//
// Visibility is decided in memory first and the sheet only changes in blocks of neighbouring columns:
// hiding or showing one column at a time forces Sheets to redo the layout per column and took seconds.
//

// installable edit trigger: only reacts to the filter controls and the closed row
function onFilterEdit(e) {
  if (!e || !e.range || e.range.getSheet().getName() !== aanwezighedenSheet.getName()) return;
  if (isFilterControl(e.range)) applyColumnFilter();
}

function isFilterControl(range) {
  const overlaps = (row, col, numRows, numCols) =>
    range.getRow() <= row + numRows - 1 && range.getRow() + range.getNumRows() - 1 >= row &&
    range.getColumn() <= col + numCols - 1 && range.getColumn() + range.getNumColumns() - 1 >= col;

  const toggle = aanwezighedenSheet.getRange('ReadOnlyToggle');
  return overlaps(toggle.getRow(), toggle.getColumn(), toggle.getNumRows(), toggle.getNumColumns())
    || overlaps(setting.headerRow - 1, setting.endHeaderColAbs + 1, 1, 2)
    || overlaps(setting.disabledEventsRow, setting.startDisabledEventsCol, 1, setting.endDisabledEventsColRel);
}

// run once from the editor: the filter on every change; replaces its own trigger and the old onChange one
function installFilterTriggers() {
  ScriptApp.getProjectTriggers()
    .filter(trigger => ['onFilterEdit', 'onChange'].indexOf(trigger.getHandlerFunction()) !== -1)
    .forEach(trigger => ScriptApp.deleteTrigger(trigger));
  ScriptApp.newTrigger('onFilterEdit').forSpreadsheet(setting.ss).onEdit().create();
}

// kept under the old name: an existing trigger or a button in the sheet may still call it
function onChange() {
  applyColumnFilter();
}

function applyColumnFilter() {
  const sheet = aanwezighedenSheet;
  const first = setting.startHeaderCol;
  const count = setting.endHeaderColRel;
  if (count < 1) return;

  const visible = columnVisibility();
  // one call to show everything, then one call per block of hidden neighbours
  sheet.showColumns(first, count);
  let i = 0;
  while (i < count) {
    if (visible[i]) { i++; continue; }
    const start = i;
    while (i < count && !visible[i]) i++;
    sheet.hideColumns(first + start, i - start);
  }
}

// per activity column: true = visible
function columnVisibility() {
  const sheet = aanwezighedenSheet;
  const count = setting.endHeaderColRel;
  if (!isChecked(sheet.getRange('ReadOnlyToggle').getValue())) return Array.from({ length: count }, () => true);

  const [filterText, hideClosed] = sheet.getRange(setting.headerRow - 1, setting.endHeaderColAbs + 1, 1, 2).getValues()[0];
  const titles = sheet.getRange(setting.headerRow, setting.startHeaderCol, 1, count).getValues()[0];
  const closed = sheet.getRange(setting.disabledEventsRow, setting.startDisabledEventsCol, 1, count).getValues()[0];
  const wanted = String(filterText).trim().toLowerCase();

  return titles.map((title, i) =>
    String(title).toLowerCase().includes(wanted) && !(isChecked(hideClosed) && String(closed[i]).trim().toUpperCase() === 'J'));
}

// old names, in case a button in the sheet is assigned to them
function filterEvenementen() { applyColumnFilter(); }
function checkboxHidePastEvents() { applyColumnFilter(); }
function unfilterEvenementen() {
  if (setting.endHeaderColRel > 0) aanwezighedenSheet.showColumns(setting.startHeaderCol, setting.endHeaderColRel);
}

//
// row filter on members (name, instrument, ...): not called by the trigger, only by hand from the editor
//
function filterMuzikanten() {
  var filterValues = aanwezighedenSheet.getRange(setting.filterRow, setting.startFilterCol, 1, setting.endFilterColRel).getValues()[0];
  var info = aanwezighedenSheet.getRange(setting.startEmailRow, setting.startFilterCol, setting.endEmailRowRel, setting.endFilterColRel).getValues();

  for(let i=0; i<info.length; i++) {
    if(shouldHideRow(filterValues, info[i])) {
      aanwezighedenSheet.hideRows(i+setting.startDataRow);
    } else {
      aanwezighedenSheet.showRows(i+setting.startDataRow);
    }
  }
}

function shouldHideRow(filterValuesList, list) {
  for(let i=0; i<list.length; i++) {
    if(!list[i].toString().toLowerCase().includes(filterValuesList[i].toString().toLowerCase())) {
      return true;
    }
  }
  return false;
}
