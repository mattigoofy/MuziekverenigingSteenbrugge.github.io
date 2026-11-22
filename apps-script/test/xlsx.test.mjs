// Reading your own spreadsheet (.xlsx) for the local server. Skipped without `npm install`.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createBackend } from '../local/gas.mjs';
import { loadXlsx, findXlsx } from '../local/xlsx.mjs';

let ExcelJS = null;
try {
  ExcelJS = (await import('exceljs')).default;
} catch (err) {}

// as Google Sheets exports it: dates as "UTC clock hours", formulas with their last result
async function writeWorkbook(file) {
  const wb = new ExcelJS.Workbook();

  const settings = wb.addWorksheet('settings');
  settings.getCell('B2').value = 4; settings.getCell('C2').value = 4;
  settings.getCell('B3').value = 5; settings.getCell('C3').value = 4;
  settings.getCell('B4').value = 5; settings.getCell('C4').value = 1;
  settings.getCell('B5').value = 3; settings.getCell('C5').value = 4;
  settings.getCell('B6').value = 2; settings.getCell('C6').value = 2;
  settings.getCell('F2').value = 'Activiteiten 2030';
  settings.getCell('H1').value = 'Mails'; settings.getCell('H2').value = 'secretaris@example.com';
  settings.getCell('E20').value = 'Agenda-link'; settings.getCell('F20').value = 'https://calendar.google.com/calendar/ical/x/basic.ics';

  const sheet = wb.addWorksheet('Activiteiten 2030');
  sheet.getCell('D3').value = 'N'; sheet.getCell('E3').value = 'N';
  sheet.getCell('D4').value = 'Concert';
  sheet.getCell('E4').value = 'Oude activiteit';
  sheet.getCell('A5').value = 'Echt@Lid.be';
  sheet.getCell('D5').value = 'X';
  sheet.getCell('G5').value = { formula: 'COUNTIF(D5:E5,"X")', result: 1 };
  sheet.getCell('G5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF9900' } };
  sheet.getCell('H5').value = { formula: 'COUNTA(D4:E4)', result: 2 };
  sheet.getCell('J5').value = 'N';

  // like the real sheet: row 1 free, column titles in row 2, the title a formula on the attendance sheet
  const act = wb.addWorksheet('Activiteiten');
  act.getCell('J1').value = 'Read Only';
  act.getRow(2).values = ['Titel', 'Start', 'Eind', 'Locatie', 'Op website', 'Op LedenActiviteiten', 'Beschrijving website', 'Beschrijving LedenActiviteiten'];
  act.getRow(3).values = [{ formula: "'Activiteiten 2030'!D4", result: 'Concert' }, new Date(Date.UTC(2030, 4, 1, 20, 0)), new Date(Date.UTC(1899, 11, 30, 22, 30)), 'Kerk', true, true, 'Gratis',
    { richText: [{ text: 'Meebrengen: ' }, { text: 'uniform', font: { bold: true, color: { argb: 'FF000000' } } }, { text: ' rood', font: { color: { argb: 'FFCC0000' } } }] }];
  act.getCell('B3').numFmt = 'dd/mm/yyyy hh:mm';
  act.getCell('C3').numFmt = 'hh:mm';

  await wb.xlsx.writeFile(file);
}

test('own .xlsx: dates, times, checkboxes, formulas, formatting and settings are carried over', { skip: !ExcelJS && 'exceljs niet geïnstalleerd' }, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'steenbrugge-'));
  const file = path.join(dir, 'export.xlsx');
  await writeWorkbook(file);
  assert.equal(findXlsx(dir), file);

  const backend = createBackend({
    spreadsheet: await loadXlsx(file),
    properties: { SHEET_ID: 'x', FIREBASE_API_KEY: 'x' },
    fakeAuth: true
  });

  const me = backend.request('GET', 'me', { query: { idToken: 'dev:echt@lid.be' } }).body;
  assert.equal(me.ok, true, JSON.stringify(me));
  assert.equal(me.data.title, 'Activiteiten 2030');
  assert.equal(me.data.calendarUrl, 'https://calendar.google.com/calendar/ical/x/basic.ics');
  assert.deepEqual(me.data.score, { score: 1, total: 2, background: '#ff9900' });
  assert.deepEqual(me.data.activities.map(a => a.id), ['concert'], '"Oude activiteit" is not in Activiteiten: hidden');

  const concert = me.data.activities[0];
  assert.equal(concert.start, new Date(2030, 4, 1, 20, 0).toISOString(), 'same clock time as in the sheet');
  assert.equal(concert.end, new Date(2030, 4, 1, 22, 30).toISOString(), 'end given as a time only');
  assert.equal(concert.answer, 'X');
  assert.equal(concert.info, '<span style="">Meebrengen: </span><span style="font-weight: 900; ">uniform</span><span style="color: #cc0000; ">rood</span>'.replace('">rood', '"> rood'));

  const pub = backend.request('GET', 'public/activities').body;
  assert.deepEqual(pub.data.activities.map(a => [a.title, a.location, a.description]), [['Concert', 'Kerk', '<span style="">Gratis</span>']]);

  fs.rmSync(dir, { recursive: true });
});

test('findXlsx without folder or without files returns null', () => {
  assert.equal(findXlsx('/bestaat/niet'), null);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'steenbrugge-'));
  assert.equal(findXlsx(dir), null);
  fs.rmSync(dir, { recursive: true });
});
