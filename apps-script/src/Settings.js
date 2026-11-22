class Settings {
  //
  // constructor
  //
  constructor() {
    const sheetID = getConfig("SHEET_ID");
    let ss = SpreadsheetApp.openById(sheetID)
    this.ss = ss;
    this.settingsSheet = ss.getSheetByName("settings");
    this.backupSheet = ss.getSheetByName("Backup");

    this.initSheetName();
    this.aanwezighedenSheet = ss.getSheetByName(this.sheetName);
    this.initSheetInfoName();
    this.infoActiviteitenSheet = ss.getSheetByName(this.sheetInfoName);
    // Logger.log(ss)

    this.initHeader();
    this.initEmail();
    this.initData();
    this.initUpdateEmails()
    this.initDisabledEvents();
    this.initInofEvents();
    this.initFilter();

  }

  //
  // initialize all variables related to the header
  //
  initHeader() {
    let header = this.settingsSheet.getRange("B2:C2").getValues()[0];

    // find last event (read the row in one go instead of cell by cell)
    const headerValues = this.aanwezighedenSheet.getRange(header[0], 1, 1, Math.max(1, this.aanwezighedenSheet.getLastColumn())).getValues()[0];
    var endHeader = header[1];
    while(endHeader <= headerValues.length && headerValues[endHeader - 1] != ""){
      endHeader++;
    }

    this.startHeaderCol = header[1];
    this.endHeaderColAbs = endHeader;
    this.endHeaderColRel = endHeader - this.startHeaderCol;
    this.headerRow = header[0];
  }

  //
  // initialize all variables related to the emails
  //
  initEmail() {
    let email = this.settingsSheet.getRange("B4:C4").getValues()[0];

    // find last email (read the column in one go instead of cell by cell)
    const emailValues = this.aanwezighedenSheet.getRange(1, email[1], Math.max(1, this.aanwezighedenSheet.getLastRow()), 1).getValues().flat();
    var endEmail = email[0];
    while(endEmail <= emailValues.length && emailValues[endEmail - 1] != ""){
      endEmail++;
    }

    this.emailCol = email[1];
    this.startEmailRow = email[0];
    this.endEmailRowAbs = endEmail;
    this.endEmailRowRel = endEmail - this.startEmailRow;
  }
  
  //
  // initialize all variables related to the data
  //
  initData() {
    let data = this.settingsSheet.getRange("B3:C3").getValues()[0];

    this.startDataCol = data[1];
    this.startDataRow = data[0];
    this.endDataColRel = this.endHeaderColRel;
    this.endDataColAbs = this.endHeaderColAbs;
    this.endDataRowRel = this.endEmailRowRel;
    this.endDataRowAbs = this.endEmailRowAbs;
  }

  //
  // initialize all variables related to disabling events
  //
  initDisabledEvents() {
    const disabledEvents = this.settingsSheet.getRange("B5:C5").getValues()[0];

    this.startDisabledEventsCol = disabledEvents[1];
    this.endDisabledEventsColRel = this.endHeaderColRel;
    this.endDisabledEventsColAbs = this.endHeaderColAbs;
    this.disabledEventsRow = disabledEvents[0];
  }

  //
  // initialize all variables related to disabling the filter
  //
  initFilter() {
    const filter = this.settingsSheet.getRange("B6:C6").getValues()[0];

    this.startFilterCol = filter[1];
    this.endFilterColAbs = this.endHeaderColAbs;
    this.endFilterColRel = this.endHeaderColAbs - this.startFilterCol;
    this.filterRow = filter[0];
  }

  //
  // initialize all variables related to activity info
  //
  initInofEvents() {
    const infoEvents = this.settingsSheet.getRange("B10:C10").getValues()[0];

    this.infoEventsCol = infoEvents[1];
    this.startinfoEventsRow = infoEvents[0];
    this.endinfoEventsRowAbs = this.endHeaderColRel + this.startinfoEventsRow;
    this.endinfoEventsRowRel = this.endHeaderColRel;
  }

  //
  // initialize the sheet name
  //
  initSheetName() {
    this.sheetName = this.settingsSheet.getRange("F2").getValue();
  }

  //
  // initialize the sheet name for activity info
  //
  initSheetInfoName() {
    this.sheetInfoName = this.settingsSheet.getRange("F8").getValue();
  }

  //
  // initialize all emails that should receive the backup mail
  //
  initUpdateEmails() {
    let emails = this.settingsSheet.getRange("H:H").getValues().flat().filter(i => i);
    emails = emails.slice(1, emails.length + 1);
    this.emailsForUpdate = "";
    for(let i=0; i<emails.length - 1; i++){
      this.emailsForUpdate += emails[i] + ",";
    }
    this.emailsForUpdate += emails[emails.length - 1];
  }
}


//
// get a value from the Script Properties (Project Settings > Script Properties)
// the values are kept locally in .env, see .env.example
//
function getConfig(key) {
  const value = PropertiesService.getScriptProperties().getProperty(key);
  if (!value) throw new Error("Script Property '" + key + "' is not set");
  return value;
}

//
// setting from the settings tab: a cell with the label, the value in the cell next to it (right)
// so the secretary can change them without a developer; empty or not found = the Script Property as fallback
//
function getSetting(label, propertyKey) {
  const wanted = String(label).trim().toLowerCase();
  const rows = setting.settingsSheet.getDataRange().getValues();
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < rows[r].length - 1; c++) {
      if (String(rows[r][c]).trim().toLowerCase() !== wanted) continue;
      const value = String(rows[r][c + 1]).trim();
      if (value) return value;
    }
  }
  return PropertiesService.getScriptProperties().getProperty(propertyKey) || null;
}

function requireSetting(label, propertyKey) {
  const value = getSetting(label, propertyKey);
  if (!value) throw new Error("Instelling '" + label + "' ontbreekt in het tabblad settings (en Script Property '" + propertyKey + "' is ook leeg)");
  return value;
}


const setting = new Settings();
// still to set: the sheets
const settingsSheet = setting.ss.getSheetByName("settings");
const backupSheet = setting.ss.getSheetByName("Backup");
const logboekSheet = setting.ss.getSheetByName("Logboek");
const aanwezighedenSheet = setting.ss.getSheetByName(setting.sheetName);
const infoActivitiesSheet = setting.ss.getSheetByName(setting.sheetInfoName);




function testSettings() {
  const settingT = new settingTest()
  let sheet = settingT.ss.getSheetByName(settingT.sheetName)
  
  Logger.log(sheet.getRange(settingT.startEmailRow, settingT.emailCol, settingT.endEmailRowRel, 1).getValues());
  Logger.log(sheet.getRange(settingT.headerRow, settingT.startHeaderCol, 1, settingT.endHeaderColRel).getValues());
  Logger.log(sheet.getRange(settingT.startDataRow, settingT.startDataCol, settingT.endDataRowRel, settingT.endDataColRel).getValues());
  Logger.log(settingT.emailsForUpdate);
}








