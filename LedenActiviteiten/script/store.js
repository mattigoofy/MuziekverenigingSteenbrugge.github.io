import { reactive } from 'vue';

export const OPTIONS = ['X', 'X?', '?', 'O?', 'O'];
export const OPTION_LABELS = [
  'Aanwezig',
  'Waarschijnlijk<br>Aanwezig',
  'Geen Idee',
  'Waarschijnlijk<br>Afwezig',
  'Afwezig'
];

export const state = reactive({
  email: localStorage.getItem('emailAanwezighedenFanfare'),
  data: JSON.parse(localStorage.getItem('dataAanwezighedenSteenbrugge') || 'null'),
  scriptURL: 'https://script.google.com/macros/s/AKfycbxZnLV4jeG1e-124oRXeYH6EL5ugfMPsrg-ORNUR8l68OlA00lLd0YXKVnD9BtMGv23/exec',
  bulletsDisabled: true,
  currentView: 'login', // 'login' | 'loading' | 'main'
  activeIndex: -1, // -1 = main grid, otherwise index into visible events
  toonAlles: false,
});
