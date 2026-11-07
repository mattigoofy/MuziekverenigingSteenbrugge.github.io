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
  // initialize alle variabelen ivm de header
  //
  initHeader() {
    let header = this.settingsSheet.getRange("B2:C2").getValues()[0];

    // vind laatste event
    var endHeader = header[1];
    while(this.aanwezighedenSheet.getRange(header[0],endHeader).getValue() != ""){
      endHeader++;
    }

    this.startHeaderCol = header[1];
    this.endHeaderColAbs = endHeader;
    this.endHeaderColRel = endHeader - this.startHeaderCol;
    this.headerRow = header[0];
  }

  //
  // initialize alle variabelen ivm de emails
  //
  initEmail() {
    let email = this.settingsSheet.getRange("B4:C4").getValues()[0];

    // vind laatste email
    var endEmail = email[0];
    while(this.aanwezighedenSheet.getRange(endEmail,email[1]).getValue() != ""){
      endEmail++;
    }

    this.emailCol = email[1];
    this.startEmailRow = email[0];
    this.endEmailRowAbs = endEmail;
    this.endEmailRowRel = endEmail - this.startEmailRow;
  }
  
  //
  // initialize alle variabelen ivm de data
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
  // initialize alle variabelen ivm events disablen
  //
  initDisabledEvents() {
    const disabledEvents = this.settingsSheet.getRange("B5:C5").getValues()[0];

    this.startDisabledEventsCol = disabledEvents[1];
    this.endDisabledEventsColRel = this.endHeaderColRel;
    this.endDisabledEventsColAbs = this.endHeaderColAbs;
    this.disabledEventsRow = disabledEvents[0];
  }

  //
  // initialize alle variabelen ivm filter disablen
  //
  initFilter() {
    const filter = this.settingsSheet.getRange("B6:C6").getValues()[0];

    this.startFilterCol = filter[1];
    this.endFilterColAbs = this.endHeaderColAbs;
    this.endFilterColRel = this.endHeaderColAbs - this.startFilterCol;
    this.filterRow = filter[0];
  }

  //
  // initialize alle variabelen ivm info activiteiten
  //
  initInofEvents() {
    const infoEvents = this.settingsSheet.getRange("B10:C10").getValues()[0];

    this.infoEventsCol = infoEvents[1];
    this.startinfoEventsRow = infoEvents[0];
    this.endinfoEventsRowAbs = this.endHeaderColRel + this.startinfoEventsRow;
    this.endinfoEventsRowRel = this.endHeaderColRel;
  }

  //
  // initialize de sheet naam
  //
  initSheetName() {
    this.sheetName = this.settingsSheet.getRange("F2").getValue();
  }

  //
  // initialize de sheet naam info activiteiten
  //
  initSheetInfoName() {
    this.sheetInfoName = this.settingsSheet.getRange("F8").getValue();
  }

  //
  // initialize alle emails die backup mail moeten ontvangen
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
// waarde uit de Script Properties halen (Project Settings > Script Properties)
// de waarden staan lokaal in .env, zie .env.example
//
function getConfig(key) {
  const value = PropertiesService.getScriptProperties().getProperty(key);
  if (!value) throw new Error("Script Property '" + key + "' is niet ingesteld");
  return value;
}


const setting = new Settings();
// nog de sheets zetten
const settingsSheet = setting.ss.getSheetByName("settings");
const backupSheet = setting.ss.getSheetByName("Backup");
const logboekSheet = setting.ss.getSheetByName("Logboek");
const aanwezighedenSheet = setting.ss.getSheetByName(setting.sheetName);
const infoActiviteitenSheetSheet = setting.ss.getSheetByName(setting.sheetInfoName);




function testSettings() {
  const settingT = new settingTest()
  let sheet = settingT.ss.getSheetByName(settingT.sheetName)
  
  Logger.log(sheet.getRange(settingT.startEmailRow, settingT.emailCol, settingT.endEmailRowRel, 1).getValues());
  Logger.log(sheet.getRange(settingT.headerRow, settingT.startHeaderCol, 1, settingT.endHeaderColRel).getValues());
  Logger.log(sheet.getRange(settingT.startDataRow, settingT.startDataCol, settingT.endDataRowRel, settingT.endDataColRel).getValues());
  Logger.log(settingT.emailsForUpdate);
}








