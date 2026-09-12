import { state } from "./state.js";
import { updateEvents, updateScore } from "./events.js";

export { loggedIn };

function loggedIn() {
    document.getElementById("main").classList.add('active');
    document.getElementById("login").style.display = "none";
    document.getElementById("loadingText").style.display = "block";
    localStorage.setItem("emailAanwezighedenFanfare", state.email);

    fetch(state.scriptURL + '?par=getTitle')
    .then(response => response.json())
    .then(data => {
        document.getElementById("title").innerHTML = data;
    })
    .catch(error => console.error('Error:', error));

    document.getElementById("email").innerHTML = state.email;

    fetch(state.scriptURL + '?par=getSpreadsheetData&email=' + state.email)
    .then(response => response.json())
    .then(scriptdata => {
        state.data = scriptdata;
        if(state.data.events.length == 0 && state.data.userData.length == 0){
            document.getElementById("loadingText").style.display = "none";
            alert("Dit email zit nog niet in de lijst.\n->Als dit een nieuw account is zal je meoeten wachten op de secretaris\n->als dit een oud account is heb je waarschijnlijk een fout email, gelieve in te loggen met het juiste email");
        } else {
            updateEvents(state.data);

            localStorage.setItem("dataAanwezighedenSteenbrugge", JSON.stringify(state.data));
            document.getElementById("editButton").style.display = "block";
            document.getElementById("loadingText").style.display = "none";

            if(state.data.readOnly){
                document.getElementById("editButton").classList.add("disabled");
            }
        }
    })
    .catch(error => console.error('Error:', error));
    document.getElementById("toonAllesLabel").style.display = "flex";

    fetch(state.scriptURL + '?par=getScore&email=' + state.email)
    .then(response => response.json())
    .then(data => {
        updateScore(state.email, data);
    })
    .catch(error => console.error('Error:', error));
}