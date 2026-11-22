// Runs the real Apps Script files (../*.js) in Node with simulated Google services.
// Every request gets a fresh context, just like a real Apps Script execution;
// the spreadsheet, cache and sent mails persist between requests.

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const CODE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SRC_DIR = path.join(CODE_DIR, 'src');

//
// spreadsheet
//
function columnNumber(letters) {
  return [...letters].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);
}

class Sheet {
  constructor(spreadsheet, name) {
    this.spreadsheet = spreadsheet;
    this.name = name;
    this.cells = new Map();
    this.hiddenColumns = new Set();
    // every hideColumns/showColumns call; in Sheets each one is a slow layout change
    this.columnCalls = [];
  }

  cell(row, col) {
    return this.cells.get(row + ',' + col) || {};
  }

  // value may be a function (sheet) => value, for formulas such as the score
  set(a1, value, extra = {}) {
    const { row, col } = this.parseA1(a1);
    this.cells.set(row + ',' + col, { ...this.cell(row, col), value, ...extra });
    return this;
  }

  read(row, col) {
    const value = this.cell(row, col).value;
    return typeof value === 'function' ? value(this) : value ?? '';
  }

  getName() { return this.name; }
  getParent() { return this.spreadsheet; }

  getLastRow() {
    let last = 0;
    for (const [key, cell] of this.cells) if (cell.value !== '' && cell.value != null) last = Math.max(last, Number(key.split(',')[0]));
    return last;
  }

  getLastColumn() {
    let last = 0;
    for (const [key, cell] of this.cells) if (cell.value !== '' && cell.value != null) last = Math.max(last, Number(key.split(',')[1]));
    return last;
  }

  parseA1(a1) {
    const match = /^([A-Z]+)(\d+)?(?::([A-Z]+)(\d+)?)?$/.exec(a1);
    if (!match) throw new Error('Range not found: ' + a1);
    const [, c1, r1, c2, r2] = match;
    const row = r1 ? Number(r1) : 1;
    const col = columnNumber(c1);
    const endRow = r2 ? Number(r2) : r1 && !c2 ? row : Math.max(this.getLastRow(), 1);
    const endCol = c2 ? columnNumber(c2) : col;
    return { row, col, numRows: endRow - row + 1, numCols: endCol - col + 1 };
  }

  hideColumns(col, count = 1) {
    this.columnCalls.push(['hide', col, count]);
    for (let c = col; c < col + count; c++) this.hiddenColumns.add(c);
  }

  showColumns(col, count = 1) {
    this.columnCalls.push(['show', col, count]);
    for (let c = col; c < col + count; c++) this.hiddenColumns.delete(c);
  }

  isColumnHiddenByUser(col) { return this.hiddenColumns.has(col); }

  getDataRange() {
    return new Range(this, 1, 1, Math.max(1, this.getLastRow()), Math.max(1, this.getLastColumn()));
  }

  getRange(rowOrA1, col, numRows = 1, numCols = 1) {
    if (typeof rowOrA1 === 'string') {
      const named = this.spreadsheet.namedRanges.get(rowOrA1);
      if (named) return named;
      const r = this.parseA1(rowOrA1);
      return new Range(this, r.row, r.col, r.numRows, r.numCols);
    }
    return new Range(this, rowOrA1, col, numRows, numCols);
  }
}

// how Sheets displays a date: 13/11/2026 20:00
function display(value) {
  if (Object.prototype.toString.call(value) !== '[object Date]') return String(value);
  const p = n => String(n).padStart(2, '0');
  // time only (Sheets stores that as 30/12/1899): display like Sheets, e.g. 22:00
  if (value.getFullYear() < 1900) return `${p(value.getHours())}:${p(value.getMinutes())}`;
  return `${p(value.getDate())}/${p(value.getMonth() + 1)}/${value.getFullYear()} ${p(value.getHours())}:${p(value.getMinutes())}`;
}

class Range {
  constructor(sheet, row, col, numRows, numCols) {
    for (const [what, n] of [['row', row], ['column', col], ['rows', numRows], ['columns', numCols]]) {
      if (!Number.isInteger(n) || n < 1) throw new Error(`Exception: The ${what} must be at least 1 (got ${n}).`);
    }
    Object.assign(this, { sheet, row, col, numRows, numCols });
  }

  map(fn) {
    return Array.from({ length: this.numRows }, (_, r) => Array.from({ length: this.numCols }, (_, c) => fn(this.row + r, this.col + c)));
  }

  getSheet() { return this.sheet; }
  getRow() { return this.row; }
  getColumn() { return this.col; }
  getNumRows() { return this.numRows; }
  getNumColumns() { return this.numCols; }

  getValues() { return this.map((r, c) => this.sheet.read(r, c)); }
  getValue() { return this.sheet.read(this.row, this.col); }
  getDisplayValues() { return this.map((r, c) => display(this.sheet.read(r, c))); }
  getDisplayValue() { return display(this.getValue()); }

  getBackground() {
    const background = this.sheet.cell(this.row, this.col).background;
    return typeof background === 'function' ? background(this.sheet) : background || '#ffffff';
  }

  setValue(value) {
    const key = this.row + ',' + this.col;
    this.sheet.cells.set(key, { ...this.sheet.cell(this.row, this.col), value });
    return this;
  }

  // rich text: cel.rich = [{ text, bold, italic, underline, color, link }, ...]
  getRichTextValues() {
    return this.map((r, c) => {
      const cell = this.sheet.cell(r, c);
      const runs = cell.rich || [{ text: String(this.sheet.read(r, c)) }];
      return {
        getText: () => runs.map(run => run.text).join(''),
        getRuns: () => runs.map(run => ({
          getText: () => run.text,
          getLinkUrl: () => run.link || null,
          getTextStyle: () => ({
            isBold: () => !!run.bold,
            isItalic: () => !!run.italic,
            isUnderline: () => !!run.underline,
            getForegroundColor: () => run.color || null
          })
        }))
      };
    });
  }
}

export class Spreadsheet {
  constructor(id = 'local-spreadsheet') {
    this.id = id;
    this.sheets = [];
    this.namedRanges = new Map();
  }

  setNamedRange(name, range) { this.namedRanges.set(name, range); }
  getRangeByName(name) { return this.namedRanges.get(name) || null; }

  addSheet(name) {
    const sheet = new Sheet(this, name);
    this.sheets.push(sheet);
    return sheet;
  }

  getId() { return this.id; }
  getUrl() { return `https://docs.google.com/spreadsheets/d/${this.id}/edit`; }
  getSheetByName(name) { return this.sheets.find(sheet => sheet.name === name) || null; }
  getSheets() { return [...this.sheets]; }
}

//
// Google Calendar: in-memory events, with tags (setTag) like the real CalendarApp
//
export class Calendar {
  constructor(id) {
    this.id = id;
    this.events = new Map();
    this.counter = 0;
  }

  createEvent(title, start, end, options = {}) {
    const id = `ev${++this.counter}@local`;
    const calendar = this;
    const data = { title, start: new Date(start), end: new Date(end), location: options.location || '', description: options.description || '', tags: {} };
    const event = {
      data,
      getId: () => id,
      getTitle: () => data.title,
      getStartTime: () => new Date(data.start),
      getEndTime: () => new Date(data.end),
      getLocation: () => data.location,
      getDescription: () => data.description,
      getTag: key => data.tags[key] ?? null,
      setTitle(v) { data.title = v; return event; },
      setTime(s, e) { data.start = new Date(s); data.end = new Date(e); return event; },
      setLocation(v) { data.location = v; return event; },
      setDescription(v) { data.description = v; return event; },
      setTag(k, v) { data.tags[k] = String(v); return event; },
      deleteEvent() { calendar.events.delete(id); }
    };
    this.events.set(id, event);
    return event;
  }

  getId() { return this.id; }
  getEventById(id) { return this.events.get(id) || null; }
  getEvents(from, to) {
    return [...this.events.values()].filter(e => e.data.start < to && e.data.end > from);
  }
}

//
// synchronous HTTP request (UrlFetchApp is synchronous), via a separate node process
//
function fetchSync(url, { method = 'get', contentType, payload, headers = {} } = {}) {
  const script = `
    let input = '';
    process.stdin.on('data', d => input += d).on('end', async () => {
      const req = JSON.parse(input);
      const res = await fetch(req.url, { method: req.method, headers: req.headers, body: req.body });
      process.stdout.write(JSON.stringify({ status: res.status, text: await res.text() }));
    });`;
  const request = { url, method: method.toUpperCase(), headers: { ...headers, ...(contentType && { 'Content-Type': contentType }) }, body: payload };
  return JSON.parse(execFileSync(process.execPath, ['-e', script], { input: JSON.stringify(request), timeout: 15000 }).toString());
}

//
// backend: keeps the state and handles requests like Apps Script
//
// options.fakeAuth: idTokens of the form "dev:<email>" count as logged in without Firebase
//                   ("dev-unverified:<email>": logged in, but the address is not confirmed)
// options.fetch: replaces the real HTTP call of UrlFetchApp (for tests)
// options.anyCalendar: every Agenda-ID returns the fake calendar (local server with a real spreadsheet)
//
export function createBackend({ spreadsheet, properties = {}, fakeAuth = false, fetch = fetchSync, anyCalendar = false, codeDir = SRC_DIR, log = () => {} }) {
  const cache = new Map();
  const outbox = [];
  const calendar = new Calendar(properties.CALENDAR_ID || 'local-calendar');
  const lock = { tryLock: () => true, waitLock: () => {}, releaseLock: () => {} };

  const services = {
    SpreadsheetApp: {
      openById: () => spreadsheet,
      getActiveSpreadsheet: () => spreadsheet,
      flush: () => {}
    },
    CalendarApp: {
      getCalendarById: id => (id === calendar.id || (anyCalendar && id) ? calendar : null)
    },
    LockService: {
      getScriptLock: () => lock
    },
    PropertiesService: {
      getScriptProperties: () => ({ getProperty: key => properties[key] ?? null })
    },
    CacheService: {
      getScriptCache: () => ({
        get(key) {
          const entry = cache.get(key);
          if (!entry || entry.expires < Date.now()) return null;
          return entry.value;
        },
        put(key, value, seconds = 600) {
          cache.set(key, { value: String(value), expires: Date.now() + seconds * 1000 });
        },
        remove(key) { cache.delete(key); }
      })
    },
    Utilities: {
      DigestAlgorithm: { SHA_256: 'sha256', MD5: 'md5' },
      computeDigest: (algorithm, text) => [...crypto.createHash(algorithm).update(String(text)).digest()].map(b => (b << 24) >> 24),
      base64EncodeWebSafe: bytes => Buffer.from(bytes.map(b => b & 255)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_')
    },
    UrlFetchApp: {
      fetch(url, options = {}) {
        const idToken = options.payload && JSON.parse(options.payload).idToken;
        let result;
        const fake = fakeAuth && url.includes('accounts:lookup') && /^dev(-unverified)?:/.exec(String(idToken));
        if (fake) {
          // "dev:<email>" = confirmed address, "dev-unverified:<email>" = account whose address is not confirmed yet
          const user = { email: idToken.slice(fake[0].length), emailVerified: !fake[1] };
          result = { status: 200, text: JSON.stringify({ users: [user] }) };
        } else {
          result = fetch(url, options);
        }
        if (result.status >= 400 && !options.muteHttpExceptions) throw new Error(`Request failed for ${url} returned code ${result.status}`);
        return { getResponseCode: () => result.status, getContentText: () => result.text };
      }
    },
    ContentService: {
      MimeType: { JSON: 'application/json', TEXT: 'text/plain' },
      createTextOutput(content) {
        return {
          mimeType: 'text/plain',
          setMimeType(type) { this.mimeType = type; return this; },
          getContent: () => content,
          getMimeType() { return this.mimeType; }
        };
      }
    },
    MailApp: {
      sendEmail(to, subject, body) {
        outbox.push({ to, subject, body });
        log(`[mail] aan ${to}: ${subject}\n${body}`);
      }
    },
    Logger: { log: () => {} },
    console: { log: () => {}, info: () => {}, warn: (...a) => log('[warn] ' + a.join(' ')), error: (...a) => log('[error] ' + a.map(x => x?.stack || x).join(' ')) }
  };

  function loadContext() {
    const context = vm.createContext({ ...services });
    const files = fs.readdirSync(codeDir).filter(file => file.endsWith('.js')).sort();
    for (const file of files) {
      new vm.Script(fs.readFileSync(path.join(codeDir, file), 'utf8'), { filename: file }).runInContext(context);
    }
    return context;
  }

  // method: 'GET' | 'POST'; path without /exec, e.g. 'me'; query: object; body: string or object
  function request(method, requestPath = '', { query = {}, body } = {}) {
    const context = loadContext();
    const contents = body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body);
    const e = {
      parameter: Object.fromEntries(Object.entries(query).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])),
      parameters: Object.fromEntries(Object.entries(query).map(([k, v]) => [k, Array.isArray(v) ? v : [v]])),
      queryString: new URLSearchParams(query).toString(),
      contextPath: '',
      contentLength: contents ? Buffer.byteLength(contents) : -1
    };
    if (requestPath.replace(/^\/+/, '')) e.pathInfo = requestPath.replace(/^\/+/, '');
    if (contents !== undefined) e.postData = { contents, length: Buffer.byteLength(contents), type: 'text/plain', name: 'postData' };

    const output = (method === 'POST' ? context.doPost : context.doGet)(e);
    return { mimeType: output.getMimeType(), body: JSON.parse(output.getContent()) };
  }

  // run a function from the Apps Script code directly, e.g. call('syncAgenda')
  function call(name, ...args) {
    return loadContext()[name](...args);
  }

  return { request, call, outbox, spreadsheet, cache, calendar };
}
