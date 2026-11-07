function doGet(e) {
  try {
    var data;
    switch(e.parameters.par[0]) {
      case "notifyNewRegister":
        data = notifyNewRegister(e.parameters.email[0], e.parameters.username[0]);
        break;
      case "getTitle":
        data = getTitle();
        break;
      case "getSpreadsheetData":
        data = getSpreadsheetData(e.parameters.email[0]);
        break;
      case "updateSpreadsheet":     //not done
        data = updateSpreadsheet(e.parameters.email[0], e.parameters.eventName[0], e.parameters.option[0]);
        break;
      case "getScore":
        data = getScore(e.parameters.email[0]);
        break;
      case "getURL":
        data = getURL();
        break;
      default:
        // throw "exeption";
        data = e.parameters.par;
    }
    return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
  }
  catch(ex) {
    var output = HtmlService.createTemplateFromFile('Page');
    return output.evaluate().setSandboxMode(HtmlService.SandboxMode.IFRAME).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL).setTitle("Activiteiten");
  }

  // favicon??
  // var output = HtmlService.createTemplateFromFile('Page');
  // return output.evaluate().setFaviconUrl("https://drive.google.com/file/d/1BtfKOWglCFyUQHXjhKCk2aOGakekUFEA/view?usp=sharing").setSandboxMode(HtmlService.SandboxMode.IFRAME).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL).setTitle("Aanwezigheden");
}

//
// om css and js files appart te houden
//
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}


//
// data uit de spreadsheet lezen
//
function getSpreadsheetData(email) {
  var events = aanwezighedenSheet.getRange(setting.headerRow, setting.startHeaderCol, 1, setting.endHeaderColRel).getValues()[0];
  
  // lijst met antwoorden van gebruiker zoeken
  const emails = aanwezighedenSheet.getRange(setting.startEmailRow, setting.emailCol, setting.endEmailRowRel, 1).getValues().flat();  
  let userIndex = emails.indexOf(email);
  Logger.log(events)
  Logger.log(emails)
  if (userIndex === -1) return { events: [], userData: [], readOnly: true, info: [] };

  userIndex += setting.startEmailRow;

  var userData = aanwezighedenSheet.getRange(userIndex, setting.startHeaderCol, userIndex, setting.endHeaderColRel).getValues()[0];
  for(let i=0; i<userData.length; i++){
    userData[i] = userData[i].toUpperCase();
  }
  Logger.log("user: " + userData)

  let readOnly = aanwezighedenSheet.getRange(userIndex, setting.endHeaderColAbs + 4).getValue();
  readOnly = readOnly==="J"? true: false;
  Logger.log(readOnly);

  // var info = aanwezighedenSheet.getRange(setting.headerRow-1, setting.startHeaderCol, 1, setting.endHeaderColRel).getRichTextValues()[0];
  // for(let i=0; i<info.length; i++){
  //   info[i] = richTextValueToHtml(info[i]);
  // }
  var acSheet = setting.ss.getSheetByName('Activiteiten');
  
  var info = acSheet.getRange(setting.startinfoEventsRow, setting.infoEventsCol, setting.endinfoEventsRowRel,1).getRichTextValues();
  // var values = acSheet.getRange(3,2, setting.endHeaderColRel,1).getValues();
  // Logger.log(values[2])
  Logger.log(info[2][0])
  for(let i=0; i<info.length; i++){
    info[i] = richTextValueToHtml(info[i][0]);
  }
  Logger.log(info);

  var disabledEvents = aanwezighedenSheet.getRange(setting.disabledEventsRow, setting.startDisabledEventsCol, 1, setting.endDisabledEventsColRel).getValues()[0];
  Logger.log(disabledEvents);
  for(let i=0; i<disabledEvents.length; i++){
    disabledEvents[i] = disabledEvents[i]=="J"? true: false;
  }
  Logger.log(disabledEvents);

  return { events: events, userData: userData, readOnly: readOnly, info: info, disabledEvents: disabledEvents };
}


//
// get info data
//
function getLastEventInfo() {
  var acSheet = setting.ss.getSheetByName('Activiteiten');
  
  var info = acSheet.getRange(setting.startinfoEventsRow, setting.infoEventsCol, setting.endinfoEventsRowRel,1).getRichTextValues();
  for(let i=0; i<readOnly.length; i++) {
    if(readOnly[i] == "N") {
      return richTextValueToHtml(info[i][0]);
    }
  }
  return null;
}


//
// naar spreadsheet schrijven
//
function updateSpreadsheet(user, eventName, value) {
  if(eventName.includes("<br>")) {
    eventName = eventName.replaceAll("<br>", "\n");
  }

  // zoeken in welke cel het event staat
  const events = aanwezighedenSheet.getRange(setting.headerRow, setting.startHeaderCol, 1, setting.endHeaderColRel).getValues()[0];
  const colIndex = events.indexOf(eventName);
  Logger.log(events)

  // zoeken in welke cel het  email adres staat
  const emails = aanwezighedenSheet.getRange(setting.startEmailRow, setting.emailCol, setting.endEmailRowRel, 1).getValues().flat();
  const rowIndex = emails.indexOf(user);
  Logger.log(emails)

  if (colIndex >= 0 && rowIndex >= 0) {
    aanwezighedenSheet.getRange(rowIndex + setting.startEmailRow, colIndex + setting.startHeaderCol).setValue(value);
    // return aanwezighedenSheet.getRange(rowIndex + setting.startEmailRow, colIndex + setting.startHeaderCol).getValue();
    return getScore(user);
  }
  return false;
}

//
// returns score of user
//
function getScore(email) {
  SpreadsheetApp.flush()

  // zoeken in welke cel het  email adres staat
  const emails = aanwezighedenSheet.getRange(setting.startEmailRow, setting.emailCol, setting.endEmailRowRel, 1).getValues().flat();
  const rowIndex = emails.indexOf(email) + setting.startEmailRow;

  // waarde uit spreadsheet halen
  let score = aanwezighedenSheet.getRange(rowIndex, setting.endHeaderColAbs + 1).getValue();
  let total = aanwezighedenSheet.getRange(rowIndex, setting.endHeaderColAbs + 2).getValue();

  Logger.log(score)
  Logger.log(total)
  if(rowIndex != setting.startEmailRow-1){
    return { score: score, total: total , background: aanwezighedenSheet.getRange(rowIndex, setting.endHeaderColAbs + 1).getBackground()}
  } else {
    return { score: "", total: "", background: "#FFDC00" }
  }
}

//
// returns title
//
function getTitle() {
  return setting.sheetName;
}

//
// sends email als er iemand geregistreerd heeft
//
function notifyNewRegister(email, username) {
  MailApp.sendEmail(getConfig("NOTIFY_EMAIL"), "Nieuw lid", username + " heeft een nieuw account gemaakt, voeg hem toe in de spreadsheet\nemailadres: " + email);
  return true;
}


//
// return the url of the current site
//
function getURL() {
  return ScriptApp.getService().getUrl();
}



function test() {
  // var info = aanwezighedenSheet.getRange(setting.headerRow-1, setting.startHeaderCol, 1, setting.endHeaderColRel).getRichTextValues()[0];
  // Logger.log(info)
  // Logger.log(richTextValueToHtml(info[2]));
  
  // var sheet = setting.ss.getSheetByName('Activiteiten');
  
  // // Get the rich text value from cell B5
  // var richTextValue = sheet.getRange(3,2, setting.endHeaderColRel,1).getRichTextValues();
  // var values = sheet.getRange(3,2, setting.endHeaderColRel,1).getValues();
  // Logger.log(values[2])
  // Logger.log(richTextValue[2][0])
  // for(let i=2; i<richTextValue.length; i++){
  //   richTextValue[i] = richTextValueToHtml(richTextValue[i][0]);
  // }
  // Logger.log(richTextValue);

  
      Logger.log(ScriptApp.getService().getUrl());
}

function richTextValueToHtml(richTextValue) {
  var runs = richTextValue.getRuns();
  var html = '';
  
  runs.forEach(function(run) {
    var text = run.getText();
    var style = run.getTextStyle();
    var linkUrl = run.getLinkUrl();
    var color = style.getForegroundColor();
    
    var span = '<span style="';
    
    // Check for bold, italic, and underline styles
    if (style.isBold()) {
      span += 'font-weight: 900; ';
    }
    if (style.isItalic()) {
      span += 'font-style: italic; ';
    }
    if (style.isUnderline()) {
      span += 'text-decoration: underline; ';
    }
    // Check for color
    if (color) {
      span += 'color: ' + color + '; ';
    }
    
    span += '">' + text + '</span>';
    
    // Check for link
    if (linkUrl) {
      span = '<a href="' + linkUrl + '">' + span + '</a>';
    }

    html += span;
  });
  
  return html;
}




