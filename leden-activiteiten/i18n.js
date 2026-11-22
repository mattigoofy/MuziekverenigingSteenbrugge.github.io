/*
 * Interface texts of the members page in Dutch and English.
 * Content from the spreadsheet (titles, descriptions) comes from the backend; see `info` / `infoEn`.
 *
 * Language: ?lang=nl|en in the URL, otherwise the choice made with the NL/EN toggle,
 * otherwise the browser: Dutch if the browser prefers Dutch, English for everyone else.
 */

const LANG_KEY = 'langSteenbrugge';
const LANGS = ['nl', 'en'];

const STRINGS = {
  nl: {
    pageTitle: 'Activiteiten Steenbrugge',
    language: 'Taal',
    edit: 'Wijzigen',
    save: 'Opslaan',
    logOut: 'Uitloggen',
    home: 'Overzicht',
    goToCard: 'Ga naar kaart {n}',
    calendarSubscribe: 'Abonneer op de ledenagenda',
    calendarSubscribeTitle: 'Abonneer je agenda-app op alle activiteiten',
    calendarCopy: 'kopieer link',
    calendarCopied: 'gekopieerd',
    calendarCopyPrompt: 'Kopieer deze link:',
    showAll: 'Toon alles',
    'answer.X': 'Aanwezig',
    'answer.X?': 'Waarschijnlijk aanwezig',
    'answer.?': 'Geen idee',
    'answer.O?': 'Waarschijnlijk afwezig',
    'answer.O': 'Afwezig',
    present: 'Aanwezig: {score}/{total}',
    loading: 'Laden...',
    updating: 'Bijwerken...',
    offline: 'Offline: gegevens van je laatste bezoek',
    loadFailed: 'Laden mislukt',
    noActivities: 'Geen activiteiten',
    noInfo: 'Geen info.',
    dateTbd: 'datum volgt',
    readOnly: 'Wijzigen is uitgeschakeld door de secretaris.',
    saveFailed: 'Opslaan mislukt: {reason}',
    notOnListRow: 'Je staat nog niet in de lijst',
    notOnList: 'Dit e-mailadres staat nog niet in de lijst.\nAls dit een nieuw account is, wacht op de secretaris.\nAls dit een oud account is, log in met het juiste e-mailadres.',

    signIn: 'Aanmelden',
    email: 'E-mail',
    password: 'Wachtwoord',
    logIn: 'Inloggen',
    forgotPassword: 'Wachtwoord vergeten',
    register: 'Registreren',
    enterEmailFirst: 'Vul eerst je e-mailadres in.',
    resetSent: 'Er is een mail verstuurd om je wachtwoord te herstellen. Controleer ook je spam.',
    namePrompt: 'Naam:',
    registered: 'Je account is aangemaakt. Je krijgt zo dadelijk een mail waarmee je je wachtwoord kunt instellen. Controleer ook je spam of ongewenste mail.',
    'auth/wrong-password': 'Fout wachtwoord, probeer opnieuw.',
    'auth/invalid-email': 'E-mailadres {email} is ongeldig.',
    'auth/invalid-credential': 'E-mail of wachtwoord is fout.\nHeb je nog geen account, spreek dan de secretaris aan.',
    'auth/too-many-requests': 'Te veel pogingen, probeer het straks opnieuw.',
    'auth/email-already-in-use': 'E-mailadres {email} is al in gebruik.',
    'auth/user-not-found': 'Geen account met dit e-mailadres.',
    'auth/other': 'Er ging iets fout, probeer opnieuw.',

    // per error code of the API (api-docs/openapi.yaml) and of the page itself
    'error.UNAUTHENTICATED': 'Je login is ongeldig of verlopen. Log opnieuw in.',
    'error.EMAIL_NOT_VERIFIED': 'Je e-mailadres is nog niet bevestigd. Stel je wachtwoord in via de link in de mail, of via "Wachtwoord vergeten".',
    'error.NOT_A_MEMBER': 'Dit e-mailadres staat nog niet in de lijst.',
    'error.FORBIDDEN': 'Dit kan niet meer gewijzigd worden (afgesloten, alleen lezen of niet van toepassing).',
    'error.NOT_FOUND': 'Deze activiteit bestaat niet meer. Herlaad de pagina.',
    'error.BAD_REQUEST': 'Ongeldige aanvraag.',
    'error.NETWORK': 'Geen verbinding met de server.',
    'error.BAD_RESPONSE': 'Onverwacht antwoord van de server.',
    'error.other': 'Er ging iets fout op de server.'
  },

  en: {
    pageTitle: 'Activities Steenbrugge',
    language: 'Language',
    edit: 'Edit',
    save: 'Save',
    logOut: 'Log out',
    home: 'Overview',
    goToCard: 'Go to card {n}',
    calendarSubscribe: 'Subscribe to the members calendar',
    calendarSubscribeTitle: 'Subscribe your calendar app to all activities',
    calendarCopy: 'copy link',
    calendarCopied: 'copied',
    calendarCopyPrompt: 'Copy this link:',
    showAll: 'Show all',
    'answer.X': 'Present',
    'answer.X?': 'Probably present',
    'answer.?': 'Not sure',
    'answer.O?': 'Probably absent',
    'answer.O': 'Absent',
    present: 'Present: {score}/{total}',
    loading: 'Loading...',
    updating: 'Updating...',
    offline: 'Offline: data from your last visit',
    loadFailed: 'Loading failed',
    noActivities: 'No activities',
    noInfo: 'No info.',
    dateTbd: 'date to be announced',
    readOnly: 'Changes have been disabled by the secretary.',
    saveFailed: 'Saving failed: {reason}',
    notOnListRow: 'You are not on the list yet',
    notOnList: 'This email address is not on the list yet.\nIf this is a new account, please wait for the secretary.\nIf this is an old account, log in with the right email address.',

    signIn: 'Sign in',
    email: 'Email',
    password: 'Password',
    logIn: 'Log in',
    forgotPassword: 'Forgot password',
    register: 'Register',
    enterEmailFirst: 'Enter your email address first.',
    resetSent: 'We sent you an email to reset your password. Please check your spam folder too.',
    namePrompt: 'Name:',
    registered: 'Your account has been created. You will shortly receive an email to set your password. Please check your spam or junk folder too.',
    'auth/wrong-password': 'Wrong password, please try again.',
    'auth/invalid-email': 'Email address {email} is not valid.',
    'auth/invalid-credential': 'Email or password is wrong.\nIf you do not have an account yet, please talk to the secretary.',
    'auth/too-many-requests': 'Too many attempts, please try again later.',
    'auth/email-already-in-use': 'Email address {email} is already in use.',
    'auth/user-not-found': 'No account with this email address.',
    'auth/other': 'Something went wrong, please try again.',

    'error.UNAUTHENTICATED': 'Your login is invalid or has expired. Please log in again.',
    'error.EMAIL_NOT_VERIFIED': 'Your email address has not been confirmed yet. Set your password with the link in the email, or via "Forgot password".',
    'error.NOT_A_MEMBER': 'This email address is not on the list yet.',
    'error.FORBIDDEN': 'This can no longer be changed (closed, read-only or not applicable).',
    'error.NOT_FOUND': 'This activity no longer exists. Please reload the page.',
    'error.BAD_REQUEST': 'Invalid request.',
    'error.NETWORK': 'No connection to the server.',
    'error.BAD_RESPONSE': 'Unexpected response from the server.',
    'error.other': 'Something went wrong on the server.'
  }
};

function storageGet(key) {
  try { return localStorage.getItem(key); } catch (e) { return null; }
}

function detectLang() {
  const fromUrl = new URLSearchParams(location.search).get('lang');
  if (LANGS.includes(fromUrl)) return fromUrl;
  const stored = storageGet(LANG_KEY);
  if (LANGS.includes(stored)) return stored;
  const preferred = (navigator.languages && navigator.languages[0]) || navigator.language || '';
  return preferred.toLowerCase().startsWith('nl') ? 'nl' : 'en';
}

export const lang = detectLang();
export const locale = lang === 'nl' ? 'nl-BE' : 'en-GB';

// t('present', { score: 3, total: 7 }); an unknown key falls back to Dutch, then to the key itself
export function t(key, vars = {}) {
  const text = STRINGS[lang][key] ?? STRINGS.nl[key] ?? key;
  return text.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? vars[name] : match));
}

// remember the chosen language and reload; a ?lang= in the URL would win, so it is removed
function setLang(code) {
  if (code === lang) return;
  try { localStorage.setItem(LANG_KEY, code); } catch (e) {}
  const url = new URL(location.href);
  url.searchParams.delete('lang');
  location.replace(url.href);
}

// NL | EN toggle: fills every <div data-lang-toggle>, the active language is highlighted
export function mountLangToggles(root = document) {
  root.querySelectorAll('[data-lang-toggle]').forEach((el) => {
    el.classList.add('lang-toggle');
    el.setAttribute('role', 'group');
    el.setAttribute('aria-label', t('language'));
    el.innerHTML = '<i class="bi bi-globe2" aria-hidden="true"></i>';
    LANGS.forEach((code) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.lang = code;
      button.textContent = code.toUpperCase();
      button.title = code === 'nl' ? 'Nederlands' : 'English';
      button.setAttribute('aria-pressed', String(code === lang));
      button.addEventListener('click', () => setLang(code));
      el.append(button);
    });
  });
}

// texts in the html: data-i18n (text), data-i18n-title, data-i18n-aria-label, data-i18n-placeholder
export function translatePage(root = document) {
  document.documentElement.lang = lang;
  root.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll('[data-i18n-title]').forEach((el) => { el.title = t(el.dataset.i18nTitle); });
  root.querySelectorAll('[data-i18n-aria-label]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.i18nAriaLabel)); });
  root.querySelectorAll('[data-i18n-placeholder]').forEach((el) => { el.placeholder = t(el.dataset.i18nPlaceholder); });
}
