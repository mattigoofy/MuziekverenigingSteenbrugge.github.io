import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  sendPasswordResetEmail, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

/* ============ FILL IN ============ */
const firebaseConfig = {
    apiKey: "AIzaSyCiIYRu6jwvoZS3KRczNIuB7leNbfgZRZI",
    authDomain: "aanwezigheden-steenbrugge.firebaseapp.com",
    projectId: "aanwezigheden-steenbrugge",
    storageBucket: "aanwezigheden-steenbrugge.appspot.com",
    messagingSenderId: "794040098578",
    appId: "1:794040098578:web:66973bf6682e9054081dcb",
    measurementId: "G-87Q7NMTT04"
};
const scriptURL = "https://script.google.com/macros/s/AKfycbxZnLV4jeG1e-124oRXeYH6EL5ugfMPsrg-ORNUR8l68OlA00lLd0YXKVnD9BtMGv23/exec";
/* ================================= */

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const EMAIL_KEY = 'emailAanwezighedenFanfare';
const STORAGE_KEYS = [
  EMAIL_KEY,
  'eventsAanwezighedenSteenbrugge',
  'infoAanwezighedenSteenbrugge',
  'dataAanwezighedenSteenbrugge',
];
const OPTIONS = ['X', 'X?', '?', 'O?', 'O'];

// ASSUMPTION: save endpoint and format, check against your Apps Script
function save(email, userData) {
  return fetch(scriptURL + '?par=saveData&email=' + encodeURIComponent(email) +
    '&data=' + encodeURIComponent(JSON.stringify(userData))).then((r) => r.json());
}

const $ = (id) => document.getElementById(id);
let email = '';
let data = null;
let editing = false;


/* ============ LOGIN ============ */
const overlay = document.createElement('div');
overlay.className = 'position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-body z-3 p-3';
overlay.innerHTML = `
  <div class="card border border-warning rounded-4 shadow-lg w-100" style="max-width:380px">
    <div class="card-body d-flex flex-column gap-3">
      <h4 class="text-warning-emphasis fw-bold text-center m-0">Aanmelden</h4>
      <input type="email" class="form-control" id="emailInput" placeholder="Email" autocomplete="username">
      <input type="password" class="form-control" id="passwordInput" placeholder="Wachtwoord" autocomplete="current-password">
      <button class="btn btn-warning" id="inlogButton">Inloggen</button>
      <div class="d-flex justify-content-between small">
        <a href="#" class="text-warning-emphasis" id="forgotLink">Wachtwoord vergeten</a>
        <a href="#" class="text-warning-emphasis" id="registerLink">Registreren</a>
      </div>
    </div>
  </div>`;
document.body.append(overlay);

function authError(error) {
  const e = $('emailInput').value;
  switch (error.code) {
    case 'auth/invalid-password':
    case 'auth/wrong-password':
      return 'Fout wachtwoord, probeer opnieuw.';
    case 'auth/invalid-email':
      return `Email adres ${e} is ongeldig.`;
    case 'auth/invalid-credential':
      return 'Email of wachtwoord is fout.';
    case 'auth/email-already-in-use':
      return `Email adres ${e} is al in gebruik.`;
    case 'auth/user-not-found':
      return 'Geen account met dit email.';
    default:
      console.log(error.message);
      return 'Er ging iets fout, probeer opnieuw';
  }
}

$('inlogButton').addEventListener('click', () => {
  signInWithEmailAndPassword(auth, $('emailInput').value.trim(), $('passwordInput').value)
    .catch((err) => alert(authError(err)));
});

$('passwordInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') $('inlogButton').click();
});

$('forgotLink').addEventListener('click', (e) => {
  e.preventDefault();
  const mail = $('emailInput').value.trim();
  if (!mail) return alert('Vul eerst je email in.');
  sendPasswordResetEmail(auth, mail)
    .then(() => alert('Er is een mail verstuurd om je wachtwoord te herstellen. Controleer ook je spam.'))
    .catch((err) => alert(authError(err)));
});

// ASSUMPTION: register = create account with random password, then send reset mail
$('registerLink').addEventListener('click', async (e) => {
  e.preventDefault();
  const mail = $('emailInput').value.trim();
  if (!mail) return alert('Vul eerst je email in.');
  const username = (prompt('Naam:') || '').trim();
  if (!username) return;
  try {
    const tmp = crypto.randomUUID() + 'Aa1!';
    await createUserWithEmailAndPassword(auth, mail, tmp);
    fetch(scriptURL + '?par=notifyNewRegister&email=' + encodeURIComponent(mail) +
      '&username=' + encodeURIComponent(username)).catch((er) => console.error(er));
    await sendPasswordResetEmail(auth, mail);
    alert('Uw account is succesvol aangemaakt. U ontvangt zo dadelijk een e-mail waarmee u uw wachtwoord kunt instellen. Gelieve ook uw spam- of ongewenste e-mail te controleren.');
  } catch (err) {
    alert(authError(err));
  }
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    email = user.email;
    localStorage.setItem(EMAIL_KEY, email);
    overlay.classList.add('d-none');
    load();
  } else {
    overlay.classList.remove('d-none');
  }
});

$('logOutButton').addEventListener('click', async () => {
  await signOut(auth);
  STORAGE_KEYS.forEach((k) => localStorage.removeItem(k));
  location.reload();
});

/* ============ DATA ============ */
function visibleIdx() {
  if (!data) return [];
  const showAll = $('showAll').checked;
  return data.events
    .map((_, i) => i)
    .filter((i) => showAll || !(data.disabledEvents && data.disabledEvents[i]));
}

function updateCount() {
  const n = data.userData.length;
  const present = data.userData.filter((v) => v === 'X').length;
  $('count').textContent = 'Aanwezig: ' + present + '/' + n;
}

function renderEvents() {
  const tbody = $('events');
  tbody.replaceChildren();
  if (!data) return;
  const idx = visibleIdx();

  idx.forEach((i, pos) => {
    const disabled = data.disabledEvents && data.disabledEvents[i];

    const tr = document.createElement('tr');
    const first = document.createElement('td');
    first.className = 'text-start';
    const a = document.createElement('a');
    a.href = '#';
    a.className = 'text-warning-emphasis';
    data.events[i].split('\n').forEach((line, k) => {
      if (k) a.append(document.createElement('br'));
      a.append(line);
    });
    a.addEventListener('click', (e) => { e.preventDefault(); go(pos + 1); });
    first.append(a);
    tr.append(first);

    const editable = editing && !disabled && data.userData[i] !== '-';
    OPTIONS.forEach((opt) => {
      const td = document.createElement('td');
      const r = document.createElement('input');
      r.type = 'radio';
      r.className = 'form-check-input';
      r.name = 'ev' + i;
      r.checked = data.userData[i] === opt;
      r.disabled = !editable;
      r.addEventListener('change', () => { data.userData[i] = opt; });
      td.append(r);
      tr.append(td);
    });
    tbody.append(tr);
  });

  if (!idx.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-secondary">Geen activiteiten</td></tr>';
  }
}

function setEditing(on) {
  editing = on;
  $('editButton').innerHTML = on
    ? '<i class="bi bi-check-lg"></i>'
    : '<i class="bi bi-pencil-fill"></i>';
  renderEvents();
}

$('editButton').addEventListener('click', async () => {
  if (!data) return;
  if (data.readOnly) return alert('Wijzigen is uitgeschakeld door de secretaris.');
  if (!editing) return setEditing(true);
  $('editButton').disabled = true;
  try {
    await save(email, data.userData);
    updateCount();
  } catch (err) {
    console.error(err);
    alert('Opslaan mislukt');
  }
  $('editButton').disabled = false;
  setEditing(false);
});

$('showAll').addEventListener('change', () => {
  renderEvents();
  buildCards();
});

function load() {
  $('email').textContent = email;

  fetch(scriptURL + '?par=getTitle')
    .then((r) => r.json())
    .then((t) => { $('title').textContent = t; })
    .catch((e) => console.error(e));

  fetch(scriptURL + '?par=getSpreadsheetData&email=' + encodeURIComponent(email))
    .then((r) => r.json())
    .then((d) => {
      if (!d.events || !d.events.length) {
        alert('Dit email zit nog niet in de lijst.\nAls dit een nieuw account is, wacht op de secretaris.\nAls dit een oud account is, log in met het juiste email.');
        return;
      }
      data = d;
      updateCount();
      renderEvents();
      buildCards();
    })
    .catch((e) => {
      console.error(e);
      $('events').innerHTML = '<tr><td colspan="6" class="text-danger">Laden mislukt</td></tr>';
    });
}

/* ============ EVENT CARDS (generated) ============ */
function buildCards() {
  stage.querySelectorAll('.event-card').forEach((c) => c.remove());

  visibleIdx().forEach((i) => {
    const [date, ...rest] = data.events[i].split('\n');
    const name = rest.join(' ') || date;

    const card = document.createElement('div');
    card.className = 'swipe-card event-card card position-absolute top-50 start-50 shadow-lg rounded-4 border border-warning';
    card.innerHTML = `
      <div class="card-header top-bar">
        <div class="row align-items-center h-100">
          <div class="col-3"><button class="btn btn-warning btn-sm" data-home aria-label="Home"><i class="bi bi-house-fill"></i></button></div>
          <div class="col-6 text-center"><h4 class="m-0 text-warning-emphasis fw-bold text-truncate" data-name></h4></div>
          <div class="col-3"></div>
        </div>
      </div>
      <div class="card-body overflow-auto">
        <div class="text-secondary small mb-2" data-date></div>
        <div data-info style="white-space: pre-wrap"></div>
      </div>`;
    card.querySelector('[data-name]').textContent = name;
    card.querySelector('[data-date]').textContent = rest.length ? date : '';
    card.querySelector('[data-info]').innerHTML =
      data.info && data.info[i] ? data.info[i] : 'Geen info.';
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
    b.setAttribute('aria-label', 'Go to card ' + (i + 1));
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
