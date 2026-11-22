// Use your own spreadsheet locally: read an .xlsx export of Google Sheets (File > Download > Microsoft Excel)
// as a simulated spreadsheet. Values, dates, formatted text, links and cell colors are carried over.
// Formulas are not recalculated: their last stored result counts (so the score does not change after saving).

import fs from 'node:fs';
import path from 'node:path';
import { Spreadsheet, CODE_DIR } from './gas.mjs';

export const DATA_DIR = path.join(CODE_DIR, 'local', 'data');

// newest .xlsx in local/data, or null
export function findXlsx(dir = DATA_DIR) {
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir)
    .filter(file => file.toLowerCase().endsWith('.xlsx') && !file.startsWith('~$'))
    .map(file => path.join(dir, file))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return files[0] || null;
}

// Excel has no time zone; exceljs reads dates as UTC. Convert back to the same clock hours in local time.
function localDate(date) {
  return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds());
}

function argbToHex(color) {
  return color && typeof color.argb === 'string' && color.argb.length === 8 ? '#' + color.argb.slice(2).toLowerCase() : null;
}

// exceljs cell value -> { value, rich } as the simulation expects it
function convert(value) {
  if (value == null) return { value: '' };
  if (value instanceof Date) return { value: localDate(value) };
  if (typeof value !== 'object') return { value };

  if (Array.isArray(value.richText)) {
    const rich = value.richText.map(run => ({
      text: run.text,
      bold: !!(run.font && run.font.bold),
      italic: !!(run.font && run.font.italic),
      underline: !!(run.font && run.font.underline),
      color: argbToHex(run.font && run.font.color)
    }));
    return { value: rich.map(run => run.text).join(''), rich };
  }
  if (value.hyperlink) {
    const text = typeof value.text === 'object' ? convert(value.text).value : String(value.text ?? value.hyperlink);
    return { value: text, rich: [{ text, link: value.hyperlink }] };
  }
  if ('formula' in value || 'sharedFormula' in value) return convert(value.result);
  if (value.error) return { value: value.error };
  return { value: String(value) };
}

export async function loadXlsx(file) {
  let ExcelJS;
  try {
    ExcelJS = (await import('exceljs')).default;
  }
  catch (err) {
    throw new Error('exceljs is missing: run `npm install` once in apps-script/');
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(file);
  const spreadsheet = new Spreadsheet(path.basename(file, path.extname(file)));

  workbook.eachSheet(worksheet => {
    const sheet = spreadsheet.addSheet(worksheet.name);
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        const { value, rich } = convert(cell.value);
        const fill = cell.fill && cell.fill.type === 'pattern' && cell.fill.pattern === 'solid' ? argbToHex(cell.fill.fgColor) : null;
        if (value === '' && !rich && !fill) return;
        sheet.cells.set(rowNumber + ',' + colNumber, { value, ...(rich && { rich }), ...(fill && { background: fill }) });
      });
    });
  });
  return spreadsheet;
}
