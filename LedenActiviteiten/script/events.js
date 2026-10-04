import { state, OPTIONS } from './store.js';

// Get events that should be visible (not disabled, or all if toonAlles is true)
export function visibleEvents() {
  if (!state.data || !state.data.events) return [];
  return state.data.events.filter((e, i) => !state.data.disabledEvents[i] || state.toonAlles);
}

// Set events data (called when data is loaded or refreshed)
export function setEvents(data) {
  if (data != null && data != 'null') {
    state.data = data;
  } else {
    state.data = { events: [], userData: [], info: [], disabledEvents: [] };
  }
}

// Open event detail page by index
export function openEvent(index) {
  state.activeIndex = index;
}

// Navigate to next event
export function openNext() {
  const max = visibleEvents().length - 1;
  state.activeIndex = Math.min(state.activeIndex + 1, max);
}

// Navigate to previous event
export function openPrevious() {
  state.activeIndex = Math.max(state.activeIndex - 1, -1);
}

// Update score display
export function setScore(score, total, background) {
  document.getElementById('score').innerHTML = 'Aanwezig: ' + score + '/' + total;
  document.getElementById('score').style.color = background;
}

// Handle radio button change
export function handleRadioChange(eventName, option) {
  fetch(state.scriptURL + '?par=updateSpreadsheet&email=' + state.email + '&eventName=' + eventName + '&option=' + option)
    .then(response => response.json())
    .then(data => {
      setScore(data.score, data.total, data.background);
    })
    .catch(error => console.error('Error:', error));

  const index = state.data.events.indexOf(eventName.replaceAll('<br>', '\n'));
  state.data.userData[index] = option;
  localStorage.setItem('dataAanwezighedenSteenbrugge', JSON.stringify(state.data));
}

// Toggle "toon alles" checkbox
export function toggleToonAlles() {
  state.bulletsDisabled = true;
  state.toonAlles = !state.toonAlles;
}

// Toggle edit mode
export function toggleEdit() {
  if (state.data?.userData) {
    if (!state.data.readOnly) {
      state.bulletsDisabled = !state.bulletsDisabled;
    } else {
      alert('Wijzigen is uitgeschakeld door de secretaris.');
    }
  }
}