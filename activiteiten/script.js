/*
 * Public activities page
 *
 * URL parameters:
 *   ?embed=1        embedded in another website (no header, transparent background, reports its height)
 *   ?limit=5        only the first 5 activities, with a link to the full list
 *   ?lang=en        English texts (Dutch by default); see i18n.js
 *   ?debug=1        pick the backend (at the bottom), e.g. the local server; only on localhost
 */

import { t, lang, locale, translatePage } from './i18n.js';

// production backend (Apps Script web app)
const PRODUCTION_API = "https://script.google.com/macros/s/AKfycby-BkqM8BNJ4vHT--4Ahf3It21iqQq2QSkK9RS6spYVneYqjHce_MrqTLwLdIKhiX4/exec";
// same key as the members page: one debug choice applies to both pages
const API_KEY = 'apiUrlAanwezighedenSteenbrugge';

const params = new URLSearchParams(location.search);
// the debug bar (pick another backend) only exists locally: online a link with ?debug=1 does nothing
const IS_LOCAL = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
const DEBUG = IS_LOCAL && params.get('debug') === '1';
const EMBED = params.get('embed') === '1';
const LIMIT = Math.max(0, parseInt(params.get('limit'), 10) || 0);

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
const $ = (id) => document.getElementById(id);

document.documentElement.classList.toggle('embed', EMBED);
document.documentElement.classList.toggle('debug', DEBUG);
translatePage();


/* ============ FORMATTING ============ */
const ZONE = { timeZone: 'Europe/Brussels' };
const WEEKDAY = new Intl.DateTimeFormat(locale, { weekday: 'short', ...ZONE });
const DAY = new Intl.DateTimeFormat(locale, { day: 'numeric', ...ZONE });
const MONTH_SHORT = new Intl.DateTimeFormat(locale, { month: 'short', ...ZONE });
const MONTH = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', ...ZONE });
const HOUR = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', ...ZONE });
const LONG = new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeStyle: 'short', ...ZONE });

// English description if there is one, otherwise the Dutch one
function descriptionOf(activity) {
  return (lang === 'en' && activity.descriptionEn) || activity.description;
}

// html from the spreadsheet to plain text (for the calendar link)
function plainText(html) {
  return new DOMParser().parseFromString(html || '', 'text/html').body.textContent.trim();
}

// link that opens Google Calendar with the event already filled in
function calendarLink(activity) {
  const stamp = (iso) => iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const url = new URL('https://calendar.google.com/calendar/render');
  url.searchParams.set('action', 'TEMPLATE');
  url.searchParams.set('text', activity.title);
  url.searchParams.set('dates', stamp(activity.start) + '/' + stamp(activity.end || activity.start));
  if (activity.location) url.searchParams.set('location', activity.location);
  const details = plainText(descriptionOf(activity));
  if (details) url.searchParams.set('details', details);
  return url.href;
}

function card(activity) {
  const node = $('activityTemplate').content.cloneNode(true);
  const start = activity.start && new Date(activity.start);
  const field = (name) => node.querySelector('[data-' + name + ']');
  translatePage(node);

  field('weekday').textContent = start ? WEEKDAY.format(start) : '';
  field('day').textContent = start ? DAY.format(start) : '?';
  field('month').textContent = start ? MONTH_SHORT.format(start) : t('dateTbdShort');
  if (start) {
    field('date').dateTime = activity.start;
    field('date').title = LONG.format(start);
  }

  field('title').textContent = activity.title;
  field('time').textContent = start
    ? HOUR.format(start) + (activity.end ? ' – ' + HOUR.format(new Date(activity.end)) : '')
    : t('dateTbd');

  if (activity.location) {
    field('location-text').textContent = activity.location;
    field('location').href = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(activity.location);
  } else {
    field('location').remove();
  }

  // description is html from the spreadsheet (formatting and links); the backend escapes the text
  field('description').innerHTML = descriptionOf(activity) || '';
  field('description').querySelectorAll('a').forEach((a) => { a.target = '_blank'; a.rel = 'noopener'; });

  if (start) field('calendar').href = calendarLink(activity);
  else field('calendar').remove();
  return node;
}


/* ============ LIST ============ */
function message(text, isError) {
  const p = document.createElement('p');
  p.className = 'message' + (isError ? ' error' : '');
  p.textContent = text;
  if (isError) {
    const retry = document.createElement('button');
    retry.className = 'retry';
    retry.textContent = t('retry');
    retry.addEventListener('click', load);
    p.append(retry);
  }
  return p;
}

// group by month; without a date at the bottom under "date to be announced"
function render(activities) {
  const list = $('list');
  const shown = LIMIT ? activities.slice(0, LIMIT) : activities;
  list.replaceChildren();

  if (!shown.length) {
    list.append(message(t('none')));
  }

  let group = null;
  shown.forEach((activity) => {
    const label = activity.start ? MONTH.format(new Date(activity.start)) : t('dateTbd');
    if (label !== group) {
      group = label;
      const heading = document.createElement('h2');
      heading.className = 'month-heading';
      heading.textContent = label;
      list.append(heading);
    }
    list.append(card(activity));
  });

  // shortened list: link to the full page (same language, without embed/limit)
  const more = LIMIT && activities.length > LIMIT;
  $('more').hidden = !more;
  if (more) {
    const full = new URL('./', location.href);
    if (params.get('lang')) full.searchParams.set('lang', lang);
    $('moreLink').href = full.href;
  }
}

async function load() {
  $('list').setAttribute('aria-busy', 'true');
  try {
    const json = await (await fetch(apiUrl.replace(/\/+$/, '') + '?path=public/activities')).json();
    if (!json.ok) throw new Error(json.error.message);
    render(json.data.activities);
  } catch (err) {
    console.error(err);
    $('list').replaceChildren(message(t('loadFailed'), true));
  }
  $('list').setAttribute('aria-busy', 'false');
}


/* ============ EMBEDDED: pass the height to embed.js on the other website ============ */
if (EMBED && window.parent !== window) {
  let last = 0;
  const report = () => {
    const height = Math.ceil(document.documentElement.getBoundingClientRect().height);
    if (height === last) return;
    last = height;
    window.parent.postMessage({ type: 'steenbrugge-activiteiten:height', height }, '*');
  };
  new ResizeObserver(report).observe(document.documentElement);
  window.addEventListener('load', report);
}

load();


/* ============ DEBUG (?debug=1) ============ */
if (DEBUG) {
  const presets = [
    ['Production', PRODUCTION_API],
    ['Local (localhost:8787)', 'http://localhost:8787/exec'],
  ];

  const panel = document.createElement('div');
  panel.id = 'debugPanel';
  panel.innerHTML = `
    <strong>DEBUG</strong>
    <select id="debugApiPreset" aria-label="Pick backend"></select>
    <input id="debugApiUrl" type="url" spellcheck="false" aria-label="Backend URL">
    <button id="debugApiSave">Save</button>`;
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
  $('debugApiSave').addEventListener('click', () => {
    const url = input.value.trim();
    storageSet(API_KEY, !url || url === PRODUCTION_API ? null : url);
    location.reload();
  });
}
