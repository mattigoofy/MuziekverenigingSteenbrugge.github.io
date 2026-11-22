//
// make backup
//
function makeBackup() {  
  const currentData = aanwezighedenSheet.getRange(setting.startDataRow, setting.startDataCol,
                                                  setting.endDataRowRel, setting.endDataColRel).getValues()

  const backupData = backupSheet.getRange(setting.startDataRow, setting.startDataCol,
                                                  setting.endDataRowRel, setting.endDataColRel).getValues()

  var text = ""

  for(let j=0; j<setting.endDataColRel; j++){
    var event = aanwezighedenSheet.getRange(setting.headerRow, setting.startHeaderCol+j).getValue();
    for(let i=0; i<setting.endDataRowRel; i++){
      if(currentData[i][j] != backupData[i][j]){
        var person = aanwezighedenSheet.getRange(setting.startEmailRow+i, setting.emailCol+2).getValue();
        var van = backupSheet.getRange(setting.startEmailRow+i, setting.startHeaderCol+j).getValue().replace("\n", "");
        var naar = aanwezighedenSheet.getRange(setting.startEmailRow+i, setting.startHeaderCol+j).getValue().replace("\n", "");
        text += "voor " + event.replace("\n", " ") + ": " + person  + " veranderd van '" + van + "' naar '" + naar + "'\n\n";
        
        // target.getRange(setting.startEmailRow+i, setting.startHeaderCol+j).clearFormat();
        // target.getRange(setting.startEmailRow+i, setting.startHeaderCol+j).setHorizontalAlignment("center");
        // target.getRange(setting.startEmailRow+i, setting.startHeaderCol+j).setBackground("#00ffff");
      }
    }
  }

  // sending mail and logging
  if(text != ""){
    text = "Lijst: " + setting.ss.getUrl() + "\n\n" + "Veranderingen aanwezigheden:\n\n" + text;
    var recipient = setting.emailsForUpdate;
    var subject = "Update aanwezigheden";
    MailApp.sendEmail(recipient, subject, text);

    logboekSheet.insertRowAfter(1);
    logboekSheet.getRange("A2").setValue(new Date())
    logboekSheet.getRange("B2").setValue(text)
  }

  
  // make backup: first the new copy, only then remove the old one, so a failed copy never leaves us without a backup
  replaceBackup(aanwezighedenSheet, "Backup");

  // also keep the Activiteiten tab
  const activiteitenSheet = setting.ss.getSheetByName(ACTIVITIES_SHEET);
  if (activiteitenSheet) replaceBackup(activiteitenSheet, "Backup Activiteiten");
}

function replaceBackup(source, name) {
  const copy = source.copyTo(setting.ss);
  const old = setting.ss.getSheetByName(name);
  if (old) setting.ss.deleteSheet(old);
  copy.setName(name);
}



//
//  to make sure it happens daily -> better via triggers in the UI
//
// repeat every day at 23:59
function createDailyTrigger() {
  // Delete all existing triggers for this function to avoid duplicates
  deleteTriggers();

  // Create a new time-based trigger that runs every day at 23:59
  ScriptApp.newTrigger('makeBackup')
           .timeBased()
           .atHour(23)
           .nearMinute(59)
           .everyDays(1)
           .create();
}

//
// delete trigger
//
// to prevent duplicate triggers
function deleteTriggers() {
  // Get all triggers for the current script
  var allTriggers = ScriptApp.getProjectTriggers();
  
  // Loop through all triggers and delete them if they are for 'makeBackup'
  for (var i = 0; i < allTriggers.length; i++) {
    if (allTriggers[i].getHandlerFunction() == 'makeBackup') { 
      ScriptApp.deleteTrigger(allTriggers[i]);
    }
  }
}

//
// check the triggers
//
function checkTriggers() {  
  var allTriggers = ScriptApp.getProjectTriggers();
  Logger.log(allTriggers[0].getHandlerFunction())
  Logger.log(allTriggers[0].getEventType())
  Logger.log(allTriggers[0].getTriggerSource())
}

