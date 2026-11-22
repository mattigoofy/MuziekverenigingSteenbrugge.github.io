// Tests for the column filter on the attendance sheet (Filter.js), run on the local simulation.

import test from 'node:test';
import assert from 'node:assert/strict';
import { createBackend } from '../local/gas.mjs';
import { createFixture, column, EVENT_COLUMNS, FILTER_TEXT_COL } from '../local/fixture.mjs';

const FIRST = 4; // first activity column (D) in the example spreadsheet

function setup() {
  const backend = createBackend({ spreadsheet: createFixture(), properties: { SHEET_ID: 'test' } });
  const sheet = backend.spreadsheet.getSheetByName('Activiteiten 2026');
  const controls = {
    toggle: value => sheet.set('B2', value),
    text: value => sheet.set(column(FILTER_TEXT_COL) + '3', value),
    hideClosed: value => sheet.set(column(FILTER_TEXT_COL + 1) + '3', value)
  };
  const run = () => {
    sheet.columnCalls = [];
    backend.call('applyColumnFilter');
    return sheet.columnCalls;
  };
  // titles of the visible activity columns
  const visible = () => EVENT_COLUMNS.filter((_, i) => !sheet.isColumnHiddenByUser(FIRST + i));
  return { backend, sheet, controls, run, visible };
}

test('filter off: every activity column visible, in one call', () => {
  const { sheet, controls, run, visible } = setup();
  controls.text('concert');
  sheet.hideColumns(FIRST + 2, 3);
  controls.toggle(false);
  assert.deepEqual(run(), [['show', FIRST, EVENT_COLUMNS.length]]);
  assert.deepEqual(visible(), EVENT_COLUMNS);
});

test('filter text: only titles that contain it (case-insensitive), hidden in blocks', () => {
  const { controls, run, visible } = setup();
  controls.toggle(true);
  controls.text('CONCERT');
  // Repetitie | Concert in de kerk, Kerstconcert | Sint-Cecilia, Etentje, Lenteconcert | Oud concert
  assert.deepEqual(visible(), EVENT_COLUMNS);
  const calls = run();
  assert.deepEqual(visible(), ['Concert in de kerk', 'Kerstconcert', 'Lenteconcert', 'Oud concert']);
  assert.deepEqual(calls, [['show', FIRST, 7], ['hide', FIRST, 1], ['hide', FIRST + 3, 2]]);
});

test('hide closed and the filter text work together (closed no longer undoes the text filter)', () => {
  const { sheet, controls, run, visible } = setup();
  controls.toggle(true);
  controls.text('concert');
  controls.hideClosed(true);
  sheet.set(column(FIRST + 2) + '3', 'J'); // Kerstconcert closed
  run();
  // before, "hide closed" showed every open column again, also Sint-Cecilia and Etentje
  assert.deepEqual(visible(), ['Concert in de kerk', 'Lenteconcert', 'Oud concert']);
});

test('hide closed without filter text hides only the J columns', () => {
  const { sheet, controls, run, visible } = setup();
  controls.toggle(true);
  controls.hideClosed(true);
  sheet.set(column(FIRST + 2) + '3', 'J');
  run();
  assert.deepEqual(visible(), ['Concert in de kerk', 'Sint-Ceciliafeest\n(leden)', 'Etentje', 'Lenteconcert', 'Oud concert']);
});

test('onFilterEdit only reacts to the filter controls and the closed row', () => {
  const { backend, sheet, controls, visible } = setup();
  controls.toggle(true);
  controls.text('kerst');
  const edit = a1 => { sheet.columnCalls = []; backend.call('onFilterEdit', { range: sheet.getRange(a1) }); return sheet.columnCalls.length; };

  assert.equal(edit('D6'), 0, 'an answer');
  assert.equal(edit('A5'), 0, 'an email address');
  assert.equal(edit(column(FILTER_TEXT_COL) + '3') > 0, true, 'filter text');
  assert.deepEqual(visible(), ['Kerstconcert']);
  assert.equal(edit(column(FILTER_TEXT_COL + 1) + '3') > 0, true, 'hide closed');
  assert.equal(edit('B2') > 0, true, 'toggle (named range)');
  assert.equal(edit('E3') > 0, true, 'closed row');

  const other = backend.spreadsheet.getSheetByName('Activiteiten');
  sheet.columnCalls = [];
  backend.call('onFilterEdit', { range: other.getRange(column(FILTER_TEXT_COL) + '3') });
  assert.equal(sheet.columnCalls.length, 0, 'another tab');
});
