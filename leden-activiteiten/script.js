import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  sendPasswordResetEmail, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { t, lang, locale, mountLangToggles, translatePage } from './i18n.js';

const firebaseConfig = {
    apiKey: "AIzaSyCiIYRu6jwvoZS3KRczNIuB7leNbfgZRZI",
    authDomain: "aanwezigheden-steenbrugge.firebaseapp.com",
    projectId: "aanwezigheden-steenbrugge",
    storageBucket: "aanwezigheden-steenbrugge.appspot.com",
    messagingSenderId: "794040098578",
    appId: "1:794040098578:web:66973bf6682e9054081dcb",
    measurementId: "G-87Q7NMTT04"
};

// production backend (Apps Script web app); locally with ?debug=1 you can pick another one at the bottom, e.g. the local server
const PRODUCTION_API = "https://script.google.com/macros/s/AKfycby-BkqM8BNJ4vHT--4Ahf3It21iqQq2QSkK9RS6spYVneYqjHce_MrqTLwLdIKhiX4/exec";
// the debug bar (pick another backend) only exists locally: online a link with ?debug=1 does nothing
const IS_LOCAL = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
const DEBUG = IS_LOCAL && new URLSearchParams(location.search).get('debug') === '1';

const DATA_KEY = 'dataAanwezighedenSteenbrugge';
const API_KEY = 'apiUrlAanwezighedenSteenbrugge';
// keys from earlier versions (back then you stayed logged in via the email address in localStorage)
const OLD_KEYS = ['emailAanwezighedenFanfare', 'eventsAanwezighedenSteenbrugge', 'infoAanwezighedenSteenbrugge'];
const OPTIONS = ['X', 'X?', '?', 'O?', 'O'];

function storageGet(key) {
  try { return localStorage.getItem(key); } catch (e) { return null; }
}

function storageSet(key, value) {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch (e) {}
}

const apiUrl = (DEBUG && storageGet(API_KEY)) || PRODUCTION_API;

translatePage();

// getAuth stores the login in the browser (IndexedDB): stay logged in until logging out
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);


/* ============ API (see api-docs/openapi.yaml) ============ */
// the message is the page's own text for the code; the English text of the API only goes to the console
class ApiError extends Error {
  constructor(code, detail) {
    super(t('error.' + code) === 'error.' + code ? t('error.other') : t('error.' + code));
    this.code = code;
    this.detail = detail;
  }
}

async function api(method, path, body) {
  if (!auth.currentUser) throw new ApiError('UNAUTHENTICATED', 'not logged in');
  const url = new URL(apiUrl.replace(/\/+$/, ''));
  url.searchParams.set('path', path);
  url.searchParams.set('idToken', await auth.currentUser.getIdToken());

  let response;
  try {
    // JSON as text/plain: this avoids a CORS preflight, which Apps Script does not support
    response = await fetch(url, method === 'POST' ? { method: 'POST', body: JSON.stringify(body || {}) } : undefined);
  } catch (e) {
    throw new ApiError('NETWORK', 'fetch failed');
  }

  let json;
  try {
    json = await response.json();
  } catch (e) {
    throw new ApiError('BAD_RESPONSE', 'response is not JSON');
  }
  if (!json.ok) throw new ApiError(json.error.code, json.error.message);
  return json.data;
}

const $ = (id) => document.getElementById(id);
let email = '';
let data = readCache();
let editing = false;
let original = null;
let registering = false;

// last loaded data, so the page shows something immediately (and offline)
function readCache() {
  try {
    const cached = JSON.parse(storageGet(DATA_KEY));
    return cached && Array.isArray(cached.activities) ? cached : null;
  } catch (e) {
    return null;
  }
}

function saveCache() {
  storageSet(DATA_KEY, JSON.stringify(data));
}

function clearCache() {
  storageSet(DATA_KEY, null);
  OLD_KEYS.forEach((k) => storageSet(k, null));
}

OLD_KEYS.forEach((k) => storageSet(k, null));

// one row over the full width of the table, e.g. "Loading..."
function tableMessage(text, isError) {
  const td = document.createElement('td');
  td.colSpan = 6;
  td.className = isError ? 'text-danger' : 'text-secondary';
  td.textContent = text;
  const tr = document.createElement('tr');
  tr.append(td);
  $('events').replaceChildren(tr);
}

function setStatus(text) {
  $('status').textContent = text || '';
  $('status').classList.toggle('d-none', !text);
}


/* ============ LOGIN ============ */
const overlay = document.createElement('div');
overlay.className = 'position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-body z-3 p-3';
overlay.innerHTML = `
  <div class="card border border-warning rounded-4 shadow-lg w-100" style="max-width:380px">
    <div class="card-body d-flex flex-column gap-3">
      <h4 class="text-warning-emphasis fw-bold text-center m-0" data-i18n="signIn"></h4>
      <input type="email" class="form-control" id="emailInput" data-i18n-placeholder="email" autocomplete="username">
      <input type="password" class="form-control" id="passwordInput" data-i18n-placeholder="password" autocomplete="current-password">
      <button class="btn btn-warning" id="logInButton" data-i18n="logIn"></button>
      <div class="d-flex justify-content-between small">
        <a href="#" class="text-warning-emphasis" id="forgotLink" data-i18n="forgotPassword"></a>
        <a href="#" class="text-warning-emphasis" id="registerLink" data-i18n="register"></a>
      </div>
      <div class="align-self-center" data-lang-toggle></div>
    </div>
  </div>`;
document.body.append(overlay);
translatePage(overlay);
mountLangToggles();

const AUTH_ERRORS = ['auth/wrong-password', 'auth/invalid-email', 'auth/invalid-credential', 'auth/too-many-requests', 'auth/email-already-in-use', 'auth/user-not-found'];

function authError(error) {
  const code = error.code === 'auth/invalid-password' ? 'auth/wrong-password' : error.code;
  if (!AUTH_ERRORS.includes(code)) {
    console.log(error.message);
    return t('auth/other');
  }
  return t(code, { email: $('emailInput').value });
}

$('logInButton').addEventListener('click', () => {
  signInWithEmailAndPassword(auth, $('emailInput').value.trim(), $('passwordInput').value)
    .catch((err) => alert(authError(err)));
});

$('passwordInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') $('logInButton').click();
});

$('forgotLink').addEventListener('click', (e) => {
  e.preventDefault();
  const mail = $('emailInput').value.trim();
  if (!mail) return alert(t('enterEmailFirst'));
  auth.languageCode = lang;
  sendPasswordResetEmail(auth, mail)
    .then(() => alert(t('resetSent')))
    .catch((err) => alert(authError(err)));
});

// registering = account with a random password, notify the secretariat, email to choose your own password
$('registerLink').addEventListener('click', async (e) => {
  e.preventDefault();
  const mail = $('emailInput').value.trim();
  if (!mail) return alert(t('enterEmailFirst'));
  const username = (prompt(t('namePrompt')) || '').trim();
  if (!username) return;

  // createUser logs in immediately; onAuthStateChanged ignores that while registering is set
  registering = true;
  try {
    const tmp = crypto.randomUUID() + 'Aa1!';
    await createUserWithEmailAndPassword(auth, mail, tmp);
    await api('POST', 'registrations', { name: username }).catch((er) => console.error(er));
    auth.languageCode = lang;
    await sendPasswordResetEmail(auth, mail);
    alert(t('registered'));
  } catch (err) {
    alert(authError(err));
  } finally {
    if (auth.currentUser) await signOut(auth);
    registering = false;
  }
});

// Firebase reports on load whether a login is still stored, and on every login or logout
onAuthStateChanged(auth, (user) => {
  if (registering) return;
  if (user) {
    email = user.email;
    overlay.classList.add('d-none');
    load();
  } else {
    clearCache();
    data = null;
    overlay.classList.remove('d-none');
  }
});

$('logOutButton').addEventListener('click', async () => {
  await signOut(auth);
  clearCache();
  location.reload();
});

/* ============ DATA ============ */
// data.activities: [{ id, title, start, end, location, info, infoEn, answer, closed }], already sorted by date
const DAY = new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/Brussels' });
const HOUR = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Brussels' });

// English description if there is one, otherwise the Dutch one
function infoOf(activity) {
  return (lang === 'en' && activity.infoEn) || activity.info;
}

function formatWhen(a) {
  if (!a.start) return t('dateTbd');
  const start = new Date(a.start);
  return DAY.format(start) + ' · ' + HOUR.format(start) + (a.end ? '–' + HOUR.format(new Date(a.end)) : '');
}

function visibleIdx() {
  if (!data) return [];
  const showAll = $('showAll').checked;
  return data.activities
    .map((_, i) => i)
    .filter((i) => showAll || !data.activities[i].closed);
}

// score and colour come from the spreadsheet; white (default) keeps the green theme colour
function updateCount() {
  const s = data.score;
  $('count').textContent = s ? t('present', { score: s.score, total: s.total }) : '';
  $('count').style.color = s && s.background && s.background.toLowerCase() !== '#ffffff' ? s.background : '';
}

function renderEvents() {
  const tbody = $('events');
  tbody.replaceChildren();
  if (!data) return;
  const idx = visibleIdx();

  idx.forEach((i, pos) => {
    const activity = data.activities[i];

    const tr = document.createElement('tr');
    const first = document.createElement('td');
    first.className = 'text-start';
    const a = document.createElement('a');
    a.href = '#';
    a.className = 'text-warning-emphasis';
    activity.title.split('\n').forEach((line, k) => {
      if (k) a.append(document.createElement('br'));
      a.append(line);
    });
    a.addEventListener('click', (e) => { e.preventDefault(); go(pos + 1); });
    const when = document.createElement('small');
    when.className = 'd-block text-secondary';
    when.textContent = formatWhen(activity);
    first.append(a, when);
    tr.append(first);

    const editable = editing && !activity.closed && activity.answer !== '-';
    OPTIONS.forEach((opt) => {
      const td = document.createElement('td');
      const r = document.createElement('input');
      r.type = 'radio';
      r.className = 'form-check-input';
      r.name = 'ev' + i;
      r.setAttribute('aria-label', t('answer.' + opt));
      r.checked = activity.answer === opt;
      r.disabled = !editable;
      r.addEventListener('change', () => { activity.answer = opt; });
      td.append(r);
      tr.append(td);
    });
    tbody.append(tr);
  });

  if (!idx.length) {
    tableMessage(t('noActivities'));
  }
}

function setEditing(on) {
  editing = on;
  original = on ? data.activities.map((a) => a.answer) : null;
  $('editButton').innerHTML = on
    ? '<i class="bi bi-check-lg"></i>'
    : '<i class="bi bi-pencil-fill"></i>';
  $('editButton').title = t(on ? 'save' : 'edit');
  $('editButton').setAttribute('aria-label', $('editButton').title);
  renderEvents();
}

$('editButton').addEventListener('click', async () => {
  if (!data) return;
  if (data.readOnly) return alert(t('readOnly'));
  if (!editing) return setEditing(true);

  // only send changed answers, one at a time so the last score is correct
  const changed = data.activities.filter((a, i) => a.answer !== original[i]);
  $('editButton').disabled = true;
  let failed = false;
  try {
    for (const activity of changed) {
      data.score = (await api('POST', 'attendance', { id: activity.id, answer: activity.answer })).score;
    }
    saveCache();
    updateCount();
  } catch (err) {
    console.error(err);
    alert(t('saveFailed', { reason: err.message }));
    // back to the previous answers; load() then fetches the real state
    data.activities.forEach((a, i) => { a.answer = original[i]; });
    failed = true;
  }
  $('editButton').disabled = false;
  setEditing(false);
  if (failed) load();
});

$('calendarCopy').addEventListener('click', () => {
  navigator.clipboard.writeText(data.calendarUrl)
    .then(() => { $('calendarCopy').textContent = t('calendarCopied'); })
    .catch(() => prompt(t('calendarCopyPrompt'), data.calendarUrl));
});

$('showAll').addEventListener('change', () => {
  renderEvents();
  buildCards();
});

async function load() {
  $('email').textContent = email;
  if (!data) tableMessage(t('loading'));
  setStatus(data ? t('updating') : '');

  try {
    data = await api('GET', 'me');
    saveCache();
    showData();
    setStatus('');
  } catch (err) {
    switch (err.code) {
      case 'NOT_A_MEMBER':
        setStatus('');
        tableMessage(t('notOnListRow'));
        alert(t('notOnList'));
        break;
      case 'EMAIL_NOT_VERIFIED':
      case 'UNAUTHENTICATED':
        alert(err.message);
        await signOut(auth);
        break;
      default:
        console.error(err, err.detail);
        if (data) {
          setStatus(t('offline'));
        } else {
          setStatus('');
          tableMessage(t('loadFailed'), true);
        }
    }
  }
}

let openedFromUrl = false;

function showData() {
  $('title').textContent = data.title || t('pageTitle');
  $('title').title = $('title').textContent;
  if (data.email) $('email').textContent = data.email;
  $('editButton').classList.toggle('btn-secondary', !!data.readOnly);
  $('editButton').classList.toggle('btn-warning', !data.readOnly);
  // webcal: subscribes immediately on iPhone and Mac; elsewhere the link is pasted into Google Calendar (Add > From URL)
  $('calendarRow').classList.toggle('d-none', !data.calendarUrl);
  if (data.calendarUrl) $('calendarLink').href = data.calendarUrl.replace(/^https?:/, 'webcal:');
  if (!editing) {
    updateCount();
    renderEvents();
    buildCards();
  }

  // link to an activity: ...?event=<ID or name with spaces instead of line breaks>
  const wanted = new URLSearchParams(location.search).get('event');
  if (wanted && !openedFromUrl) {
    openedFromUrl = true;
    const pos = visibleIdx().findIndex((i) => data.activities[i].id === wanted || data.activities[i].title.replace(/\n/g, ' ') === wanted);
    if (pos !== -1) go(pos + 1);
  }
}

/* ============ EVENT CARDS (generated) ============ */
function buildCards() {
  stage.querySelectorAll('.event-card').forEach((c) => c.remove());

  visibleIdx().forEach((i) => {
    const activity = data.activities[i];
    const name = activity.title.replace(/\n/g, ' ');

    const card = document.createElement('div');
    card.className = 'swipe-card event-card card position-absolute top-50 start-50 shadow-lg rounded-4 border border-warning';
    card.innerHTML = `
      <div class="card-header top-bar">
        <div class="d-flex align-items-center gap-2 h-100">
          <div class="top-side"><button class="btn btn-warning btn-sm" data-home data-i18n-aria-label="home" data-i18n-title="home"><i class="bi bi-house-fill"></i></button></div>
          <h4 class="top-title m-0 text-warning-emphasis fw-bold" data-name></h4>
          <div class="top-side"></div>
        </div>
      </div>
      <div class="card-body overflow-auto">
        <div class="text-secondary small mb-2" data-date></div>
        <div data-info style="white-space: pre-wrap"></div>
      </div>`;
    card.querySelector('[data-name]').textContent = name;
    card.querySelector('[data-name]').title = name;
    card.querySelector('[data-date]').textContent = formatWhen(activity);
    if (activity.location) {
      // the link on the location cell if there is one, otherwise a Google Maps search for the text
      const place = document.createElement('a');
      place.className = 'text-warning-emphasis';
      place.href = activity.locationUrl || 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(activity.location);
      place.target = '_blank';
      place.rel = 'noopener';
      place.innerHTML = '<i class="bi bi-geo-alt"></i> ';
      place.append(activity.location);
      card.querySelector('[data-date]').append(' · ', place);
    }
    translatePage(card);
    card.querySelector('[data-info]').innerHTML = infoOf(activity) || t('noInfo');
    card.querySelector('[data-home]').addEventListener('click', () => go(0));
    stage.append(card);
  });

  setupCards();
}

/* ============ SWIPE ============ */
const stage = $('stage');
const dotsEl = $('dots');
const THRESHOLD = 60;

let cards = [];
let last = 0;
let cur = 0;
let dx = 0;
let startX = 0;
let dragging = false;

function setupCards() {
  cards = [...stage.querySelectorAll('.swipe-card')];
  last = cards.length - 1;
  cur = Math.min(cur, last);

  dotsEl.replaceChildren();
  cards.forEach((_, i) => {
    const b = document.createElement('button');
    b.className = 'btn rounded-circle p-0';
    b.style.width = b.style.height = '10px';
    b.setAttribute('aria-label', t('goToCard', { n: i + 1 }));
    b.addEventListener('click', () => go(i));
    dotsEl.append(b);
  });
  render();
}

function render() {
  const off = window.innerWidth;
  cards.forEach((c, i) => {
    let x = 0;
    let s = 1;
    let o = 1;

    if (i < cur) {
      s = 0.92;
      o = (i === cur - 1 && dx > 0) ? 1 : 0;
      if (i === cur - 1 && dx > 0) s = 0.92 + 0.08 * Math.min(dx / off, 1);
    } else if (i === cur) {
      if (dx > 0) x = cur > 0 ? dx : dx * 0.3;
      else if (dx < 0 && cur === last) x = dx * 0.3;
    } else if (i === cur + 1) {
      x = off + (dx < 0 ? dx : 0);
    } else {
      x = off;
    }

    c.style.setProperty('--x', x + 'px');
    c.style.setProperty('--s', s);
    c.style.opacity = o;
    c.style.pointerEvents = i === cur ? 'auto' : 'none';
    c.style.zIndex = i;
  });

  [...dotsEl.children].forEach((d, i) => {
    d.classList.toggle('btn-warning', i === cur);
    d.classList.toggle('btn-secondary', i !== cur);
  });
}

function go(i) {
  cur = Math.max(0, Math.min(last, i));
  dx = 0;
  render();
}

stage.addEventListener('pointerdown', (e) => {
  if (e.target.closest('button, input, a, label')) return;
  dragging = true;
  startX = e.clientX;
  dx = 0;
  stage.classList.add('dragging');
  stage.setPointerCapture(e.pointerId);
});

stage.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  dx = e.clientX - startX;
  render();
});

function endDrag(cancelled) {
  if (!dragging) return;
  dragging = false;
  stage.classList.remove('dragging');
  if (!cancelled) {
    if (dx < -THRESHOLD && cur < last) cur++;
    else if (dx > THRESHOLD && cur > 0) cur--;
  }
  dx = 0;
  render();
}

stage.addEventListener('pointerup', () => endDrag(false));
stage.addEventListener('pointercancel', () => endDrag(true));

window.addEventListener('keydown', (e) => {
  if (e.target.matches('input')) return;
  if (e.key === 'ArrowRight') go(cur + 1);
  if (e.key === 'ArrowLeft') go(cur - 1);
});

window.addEventListener('resize', render);
setupCards();

// show data from the previous visit immediately; onAuthStateChanged confirms the login
if (data) {
  overlay.classList.add('d-none');
  showData();
}


/* ============ DEBUG (?debug=1) ============ */
if (DEBUG) {
  const presets = [
    ['Production', PRODUCTION_API],
    ['Local (localhost:8787)', 'http://localhost:8787/exec'],
  ];

  document.body.classList.add('debug');
  const panel = document.createElement('div');
  panel.id = 'debugPanel';
  panel.className = 'position-fixed bottom-0 start-0 end-0 d-flex flex-wrap align-items-center gap-2 px-3 py-2 small bg-danger-subtle border-top border-danger';
  panel.innerHTML = `
    <strong class="text-danger-emphasis">DEBUG</strong>
    <select class="form-select form-select-sm w-auto" id="debugApiPreset" aria-label="Pick backend"></select>
    <input class="form-control form-control-sm w-auto flex-grow-1" style="min-width: 12rem" id="debugApiUrl" type="url" spellcheck="false" aria-label="Backend URL">
    <button class="btn btn-sm btn-warning" id="debugApiSave">Save</button>
    <button class="btn btn-sm btn-outline-warning" id="debugApiTest">Test</button>
    <span id="debugApiResult"></span>`;
  document.body.append(panel);

  const select = $('debugApiPreset');
  const input = $('debugApiUrl');
  [...presets, ['Other...', '']].forEach(([label, url]) => select.add(new Option(label, url)));
  input.value = apiUrl;
  select.value = presets.some(([, url]) => url === apiUrl) ? apiUrl : '';

  select.addEventListener('change', () => {
    if (select.value) input.value = select.value;
    input.focus();
  });

  // other backend = other data: clear the cache and reload
  $('debugApiSave').addEventListener('click', () => {
    const url = input.value.trim();
    storageSet(API_KEY, !url || url === PRODUCTION_API ? null : url);
    storageSet(DATA_KEY, null);
    location.reload();
  });

  $('debugApiTest').addEventListener('click', async () => {
    $('debugApiResult').textContent = '...';
    try {
      const json = await (await fetch(input.value.trim().replace(/\/+$/, '') + '?path=health')).json();
      $('debugApiResult').textContent = json.ok ? 'OK: ' + json.data.title : 'Error: ' + json.error.code;
    } catch (e) {
      $('debugApiResult').textContent = 'Not reachable';
    }
  });

  // token for curl: run `await getIdToken()` in the console
  window.getIdToken = () => auth.currentUser.getIdToken();
}
