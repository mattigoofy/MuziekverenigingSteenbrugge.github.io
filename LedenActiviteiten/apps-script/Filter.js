function filterMuzikanten() {
  // var muzikanten = aanwezighedenSheet.getRange(setting.startDataRow, setting.startDataCol - 1, setting.endDataRowRel, 1).getValues().flat();
  // var filterValueMuzikanten = aanwezighedenSheet.getRange(setting.startDataRow - 3, setting.startDataCol - 1).getValue();
  // var instrumenten = aanwezighedenSheet.getRange(setting.startDataRow, setting.startDataCol - 2, setting.endDataRowRel, 1).getValues().flat();
  // var filterValueInstrumenten = aanwezighedenSheet.getRange(setting.startDataRow - 3, setting.startDataCol - 2).getValue();

  // for(let i=0; i<muzikanten.length; i++) {
  //   if(!muzikanten[i].toLowerCase().includes(filterValueMuzikanten.toLowerCase()) ||
  //     !instrumenten[i].toLowerCase().includes(filterValueInstrumenten.toLowerCase())) {
  //     aanwezighedenSheet.hideRows(i+setting.startDataRow);
  //   } else {
  //     aanwezighedenSheet.showRows(i+setting.startDataRow);
  //   }
  // }
  var filterValues = aanwezighedenSheet.getRange(setting.filterRow, setting.startFilterCol, 1, setting.endFilterColRel).getValues()[0];
  Logger.log(setting.filterRow +","+ setting.startFilterCol +","+ setting.endFilterColRel)
  var info = aanwezighedenSheet.getRange(setting.startEmailRow, setting.startFilterCol, setting.endEmailRowRel, setting.endFilterColRel).getValues();
  Logger.log(filterValues);

  for(let i=0; i<info.length; i++) {
    if(shouldHideRow(filterValues, info[i])) {
      aanwezighedenSheet.hideRows(i+setting.startDataRow);
    } else {
      aanwezighedenSheet.showRows(i+setting.startDataRow);
    }
  }
}

function shouldHideRow(filterValuesList, list) {
  for(let i=0; i<list.length; i++) {
    if(!list[i].toString().toLowerCase().includes(filterValuesList[i].toString().toLowerCase())) {
      return true;
    }
  }
  return false;
}


function filterEvenementen() {
  var evenementen = aanwezighedenSheet.getRange(setting.headerRow, setting.startHeaderCol, 1, setting.endHeaderColRel).getValues()[0];
  var filterValue = aanwezighedenSheet.getRange(setting.headerRow - 1, setting.endHeaderColAbs + 1).getValue();

  for(let i=0; i<evenementen.length; i++) {
    if(!evenementen[i].toLowerCase().includes(filterValue.toLowerCase())) {
      aanwezighedenSheet.hideColumns(i+setting.startHeaderCol);
    } else {
      aanwezighedenSheet.showColumns(i+setting.startHeaderCol);
    }
  }
}

function unfilterEvenementen() {
  var evenementen = aanwezighedenSheet.getRange(setting.headerRow, setting.startHeaderCol, 1, setting.endHeaderColRel).getValues()[0];
  var filterValue = aanwezighedenSheet.getRange(setting.headerRow - 1, setting.endHeaderColAbs + 1).getValue();

  for(let i=0; i<evenementen.length; i++) {
    aanwezighedenSheet.showColumns(i+setting.startHeaderCol);
  }
}

function onChange() {
  var filter = aanwezighedenSheet.getRange('ReadOnlyToggle').getValue();
  Logger.log(filter)
  if(filter) {
    // filterMuzikanten();
    filterEvenementen();
    checkboxHidePastEvents();
  } else {
    unfilterEvenementen();
  }
}

// function onChange_activiteiten() {
//   let filter = aanwezighedenSheet.getRange('ReadOnlyToggleLedenPagina').getValue();
// 
//   if (filter) {
//     filterLedenPagina();
//   }
// }


function checkboxHidePastEvents() {
  var checkbox = aanwezighedenSheet.getRange(setting.headerRow - 1, setting.endHeaderColAbs + 2).getValue()
  if(checkbox) {
    var readOnly = aanwezighedenSheet.getRange(setting.disabledEventsRow, setting.startDisabledEventsCol, 1, setting.endDisabledEventsColRel).getValues()[0];
    Logger.log(readOnly)
    for(let i=0; i<readOnly.length; i++) {
      if(readOnly[i] == "J") {
        aanwezighedenSheet.hideColumns(i+setting.startHeaderCol);
      } else {
        aanwezighedenSheet.showColumns(i+setting.startHeaderCol);
      }
    }
  } 
}

