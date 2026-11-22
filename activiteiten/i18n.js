/*
 * Interface texts of the public activities page in Dutch and English.
 * Content from the spreadsheet (titles, descriptions) comes from the backend; see `description` / `descriptionEn`.
 *
 * Language: Dutch, unless the URL has ?lang=en (embed.js passes data-lang on). No switch, no browser detection.
 */

const LANGS = ['nl', 'en'];

const STRINGS = {
  nl: {
    pageTitle: 'Activiteiten · Muziekvereniging Steenbrugge',
    metaDescription: 'Komende concerten en activiteiten van Muziekvereniging Steenbrugge.',
    heading: 'Activiteiten',
    seeAll: 'Alle activiteiten bekijken',
    addToCalendar: 'Zet in mijn agenda',
    dateTbd: 'Datum volgt',
    dateTbdShort: 'datum volgt',
    none: 'Er staan op dit moment geen activiteiten gepland.',
    loadFailed: 'De activiteiten konden niet geladen worden.',
    retry: 'Probeer opnieuw'
  },
  en: {
    pageTitle: 'Activities · Muziekvereniging Steenbrugge',
    metaDescription: 'Upcoming concerts and activities of Muziekvereniging Steenbrugge.',
    heading: 'Activities',
    seeAll: 'See all activities',
    addToCalendar: 'Add to my calendar',
    dateTbd: 'Date to be announced',
    dateTbdShort: 'date TBA',
    none: 'There are no activities planned at the moment.',
    loadFailed: 'The activities could not be loaded.',
    retry: 'Try again'
  }
};

function detectLang() {
  const fromUrl = new URLSearchParams(location.search).get('lang');
  return LANGS.includes(fromUrl) ? fromUrl : 'nl';
}

export const lang = detectLang();
export const locale = lang === 'nl' ? 'nl-BE' : 'en-GB';

export function t(key) {
  return STRINGS[lang][key] ?? STRINGS.nl[key] ?? key;
}

// texts in the html: data-i18n (text), data-i18n-content (meta tags)
export function translatePage(root = document) {
  document.documentElement.lang = lang;
  root.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll('[data-i18n-content]').forEach((el) => { el.content = t(el.dataset.i18nContent); });
}
