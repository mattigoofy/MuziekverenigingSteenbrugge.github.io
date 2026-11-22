// Local backend: runs the real Apps Script code (../*.js) at http://localhost:8787/exec.
// Code changes apply immediately (no restart needed); the spreadsheet is kept in memory and
// reloaded when the xlsx file is saved (changes made through the API are then lost).
//
//   node local/server.mjs [--port 8787] [--fake-auth] [--xlsx path/to/export.xlsx | --example]
//
// Which spreadsheet: --xlsx <file>, otherwise LOCAL_XLSX from .env, otherwise the newest .xlsx in local/data/,
// otherwise (or with --example; --voorbeeld still works) the example spreadsheet from fixture.mjs.
//
// --fake-auth: idToken "dev:<email>" counts as logged in with a confirmed address (handy for curl),
//              "dev-unverified:<email>" as an account whose address is not confirmed yet;
//              real Firebase tokens keep working too.
// Member calendar (fake, in memory): POST /local/agenda/sync runs syncAgenda, GET /local/agenda shows the events.
// Settings come from ../.env (see .env.example).

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createBackend, CODE_DIR } from './gas.mjs';
import { createFixture } from './fixture.mjs';
import { findXlsx, loadXlsx } from './xlsx.mjs';

export function readEnv(file = path.join(CODE_DIR, '.env')) {
  if (!fs.existsSync(file)) return {};
  return Object.fromEntries(
    fs.readFileSync(file, 'utf8').split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#') && line.includes('='))
      .map(line => [line.slice(0, line.indexOf('=')).trim(), line.slice(line.indexOf('=') + 1).trim()])
  );
}

export function createServer({ backend, log = () => {} }) {
  return http.createServer((req, res) => {
    const started = Date.now();
    const url = new URL(req.url, 'http://localhost');

    // Apps Script does not answer a CORS preflight; neither does this, so such an error shows up here already
    if (req.method === 'OPTIONS') {
      res.writeHead(405).end();
      log(`OPTIONS ${url.pathname} -> 405 (Apps Script does not support a preflight)`);
      return;
    }
    if (url.pathname.startsWith('/local/agenda')) {
      let payload;
      try {
        payload = url.pathname === '/local/agenda/sync' && req.method === 'POST'
          ? { ok: true, data: backend.call('syncAgenda') }
          : { ok: true, data: [...backend.calendar.events.values()].map(e => ({ id: e.getId(), ...e.data })).sort((a, b) => a.start - b.start) };
      }
      catch (err) {
        payload = { ok: false, error: { code: 'SCRIPT_ERROR', message: String(err.message || err) } };
      }
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' }).end(JSON.stringify(payload, null, 2));
      log(`${req.method} ${url.pathname} -> ${payload.ok ? 'ok' : payload.error.message}`);
      return;
    }
    if (!/^\/exec(\/|$)/.test(url.pathname) || !['GET', 'POST'].includes(req.method)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Use GET or POST on /exec/<path>, e.g. /exec/health\n');
      return;
    }

    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      let status = 200;
      let payload;
      try {
        const result = backend.request(req.method, url.pathname.replace(/^\/exec\/?/, ''), {
          query: Object.fromEntries(url.searchParams),
          body: req.method === 'POST' ? body : undefined
        });
        payload = JSON.stringify(result.body);
      }
      catch (err) {
        // error outside doGet/doPost (e.g. while loading Settings.js): Apps Script then shows an html error page
        status = 500;
        payload = JSON.stringify({ ok: false, error: { code: 'SCRIPT_ERROR', message: String(err.message || err) } });
        log(err.stack || err);
      }
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' }).end(payload);

      const parsed = JSON.parse(payload);
      log(`${req.method} ${url.pathname} -> ${parsed.ok ? 'ok' : parsed.error.code} (${Date.now() - started} ms)`);
    });
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const port = Number(args[args.indexOf('--port') + 1]) || Number(process.env.PORT) || 8787;
  const fakeAuth = args.includes('--fake-auth');
  // .env, with environment variables of the same name taking precedence (e.g. AGENDA_ICAL_URL=... node local/server.mjs)
  const KEYS = ['SHEET_ID', 'NOTIFY_EMAIL', 'FIREBASE_API_KEY', 'CALENDAR_ID', 'AGENDA_ICAL_URL', 'LOCAL_MEMBERS', 'LOCAL_XLSX'];
  const env = { ...readEnv(), ...Object.fromEntries(KEYS.filter(k => process.env[k]).map(k => [k, process.env[k]])) };
  const extraEmails = (env.LOCAL_MEMBERS || '').split(',').map(s => s.trim()).filter(Boolean);

  if (!env.FIREBASE_API_KEY) console.warn('Note: FIREBASE_API_KEY is missing from .env, real logins will be rejected.');

  const argValue = name => (args.includes(name) ? args[args.indexOf(name) + 1] : null);
  const xlsx = (args.includes('--example') || args.includes('--voorbeeld')) ? null : argValue('--xlsx') || env.LOCAL_XLSX || findXlsx();

  const properties = { CALENDAR_ID: 'local-calendar', ...env };

  async function load() {
    let spreadsheet;
    if (xlsx) {
      spreadsheet = await loadXlsx(path.resolve(xlsx));
      console.log(`Spreadsheet: ${path.resolve(xlsx)}`);
      if (extraEmails.length) console.warn('LOCAL_MEMBERS is ignored: the members come from your own spreadsheet.');
    } else {
      spreadsheet = createFixture({ extraEmails });
      console.log(`Spreadsheet: example (members piet@example.com, an@example.com, jan@example.com${extraEmails.length ? ', ' + extraEmails.join(', ') : ''})`);
    }
    const backend = createBackend({ spreadsheet, properties, fakeAuth, anyCalendar: true, log: console.log });

    // show right away whether the code can read the spreadsheet (tabs, settings)
    try {
      const health = backend.request('GET', 'health').body;
      console.log(health.ok ? `Check: ok, attendance sheet "${health.data.title}"` : `Check: ${health.error.code} ${health.error.message}`);
      const pub = backend.request('GET', 'public/activities').body;
      console.log(pub.ok ? `Check: ${pub.data.activities.length} public activities` : `Check public list: ${pub.error.message}`);
      const hidden = backend.call('hiddenColumns');
      console.log(!hidden.filterActive
        ? "Check: no 'Op LedenActiviteiten' column, members see every attendance column"
        : `Check: ${hidden.hidden.length} attendance column(s) hidden from members` + hidden.hidden.map(t => `\n  - ${t}`).join(''));
    }
    catch (err) {
      console.warn(`Check failed: ${err.message}`);
    }
    return backend;
  }

  // the server always talks to the latest load: saving the xlsx reloads it, no restart needed
  let current = await load();
  const backend = new Proxy({}, { get: (_, key) => current[key] });
  if (xlsx) {
    let timer = null;
    fs.watchFile(path.resolve(xlsx), { interval: 1000 }, () => {
      clearTimeout(timer);
      // wait until the save is finished; a half-written file keeps the previous version
      timer = setTimeout(() => load().then(b => { current = b; console.log('Spreadsheet reloaded'); })
        .catch(err => console.warn(`Reload failed, keeping the previous version: ${err.message}`)), 1000);
    });
  }

  createServer({ backend, log: console.log }).listen(port, '127.0.0.1', () => {
    console.log(`Lokale API op http://localhost:${port}/exec  (fake-auth: ${fakeAuth ? 'on' : 'off'})`);
    console.log(`Calendar: curl -X POST localhost:${port}/local/agenda/sync  and  curl localhost:${port}/local/agenda`);
  });
}
