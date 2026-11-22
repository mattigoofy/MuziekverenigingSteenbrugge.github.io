//
// members agenda, menu and triggers
//
// the spreadsheet is the memory: per activity (row) it holds the Agenda-ID of the event this script created
// and a fingerprint of title, time, location and description at the last sync
//

// label on every event of this script; this leaves events someone adds to the agenda themselves untouched
const AGENDA_TAG = 'activiteit';
const AGENDA_STATUS = {
  later: 'Nog te plannen',
  ready: 'Klaar om te plannen',
  changed: 'Gewijzigd',
  planned: 'Gepland'
};

//
// sync the agenda with the Activiteiten tab (every hour via trigger, or via the menu)
// every activity with a date goes into the agenda
//
function syncAgenda() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return { skipped: true };

  try {
    const calendar = CalendarApp.getCalendarById(requireSetting('Agenda-ID', 'CALENDAR_ID'));
    if (!calendar) throw new Error("Agenda niet gevonden, controleer 'Agenda-ID' in het tabblad settings");

    const { sheet, columns, activities } = requireActivities();
    ['agendaId', 'agendaStatus', 'agendaFingerprint'].forEach(key => {
      if (!columns[key]) throw new Error("Kolom '" + COLUMN_TITLES[key] + "' ontbreekt in " + ACTIVITIES_SHEET);
    });

    const result = { created: 0, updated: 0, deleted: 0 };
    const kept = {};

    activities.forEach(activity => {
      let agendaId = activity.agendaId;
      let fingerprint = activity.agendaFingerprint;
      let status;

      if (!activity.start) {
        if (agendaId) {
          const event = calendar.getEventById(agendaId);
          if (event) {
            event.deleteEvent();
            result.deleted++;
          }
          agendaId = '';
          fingerprint = '';
        }
        status = AGENDA_STATUS.later;
      } else {
        const wanted = hash(JSON.stringify([activity.title, activity.start.getTime(), activity.end.getTime(), activity.location, activity.descriptionText]));
        let event = agendaId ? calendar.getEventById(agendaId) : null;

        if (!event) {
          // new, or the event was deleted in the agenda itself
          event = calendar.createEvent(activity.title, activity.start, activity.end, { location: activity.location, description: activity.descriptionText });
          event.setTag(AGENDA_TAG, activity.title);
          agendaId = event.getId();
          fingerprint = wanted;
          result.created++;
        } else if (fingerprint !== wanted) {
          event.setTitle(activity.title);
          event.setTime(activity.start, activity.end);
          event.setLocation(activity.location);
          event.setDescription(activity.descriptionText);
          fingerprint = wanted;
          result.updated++;
        }
        kept[agendaId] = true;
        status = AGENDA_STATUS.planned;
      }

      if (agendaId !== activity.agendaId) sheet.getRange(activity.row, columns.agendaId).setValue(agendaId);
      if (fingerprint !== activity.agendaFingerprint) sheet.getRange(activity.row, columns.agendaFingerprint).setValue(fingerprint);
      sheet.getRange(activity.row, columns.agendaStatus).setValue(status);
    });

    // events of this script whose row is gone; manual events (without label) are left alone
    const from = new Date(Date.now() - 400 * 24 * 3600 * 1000);
    const to = new Date(Date.now() + 3 * 365 * 24 * 3600 * 1000);
    calendar.getEvents(from, to).forEach(event => {
      if (event.getTag(AGENDA_TAG) && !kept[event.getId()]) {
        event.deleteEvent();
        result.deleted++;
      }
    });

    console.log('syncAgenda: ' + JSON.stringify(result));
    return result;
  }
  finally {
    lock.releaseLock();
  }
}

//
// installable trigger on every change in Activiteiten: show what the next sync will do
//
function onActivitiesEdit(e) {
  if (!e || !e.range || e.range.getSheet().getName() !== ACTIVITIES_SHEET) return;
  const { sheet, columns, activities, missing } = readActivities();
  if (missing.length || !columns.agendaStatus) return;
  const first = e.range.getRow();
  const last = first + e.range.getNumRows() - 1;

  activities.filter(a => a.row >= first && a.row <= last).forEach(activity => {
    const status = !activity.start ? (activity.agendaId ? AGENDA_STATUS.changed : AGENDA_STATUS.later)
      : activity.agendaId ? AGENDA_STATUS.changed : AGENDA_STATUS.ready;
    sheet.getRange(activity.row, columns.agendaStatus).setValue(status);
  });
}

function showMenu() {
  SpreadsheetApp.getUi().createMenu('Ledenpagina')
    .addItem('Agenda nu bijwerken', 'syncAgenda')
    .addToUi();
}

//
// run once from the editor: sync every hour, status on every change, menu on open
// replaces its own triggers, so running it again never makes doubles
//
function installAgendaTriggers() {
  // also the old Dutch names, so triggers from an earlier version are cleaned up
  ScriptApp.getProjectTriggers()
    .filter(trigger => ['syncAgenda', 'onActivitiesEdit', 'showMenu', 'onActiviteitenEdit', 'toonMenu'].indexOf(trigger.getHandlerFunction()) !== -1)
    .forEach(trigger => ScriptApp.deleteTrigger(trigger));
  ScriptApp.newTrigger('syncAgenda').timeBased().everyHours(1).create();
  ScriptApp.newTrigger('onActivitiesEdit').forSpreadsheet(setting.ss).onEdit().create();
  ScriptApp.newTrigger('showMenu').forSpreadsheet(setting.ss).onOpen().create();
}
