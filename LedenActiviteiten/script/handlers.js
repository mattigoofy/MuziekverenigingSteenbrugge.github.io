import { state } from "./state.js";
import { moveToNextPage, updateEvents } from "./events.js";

document.getElementById("loginBackButton").addEventListener('click', function(event) {
    event.preventDefault();
    document.getElementById("loginBackButton").style.display = "none";
    document.getElementById("passwordLabel").style.display = "block";
    document.getElementById("passwordInput").style.display = "block";
    document.getElementById("usernameLabel").style.display = "none";
    document.getElementById("usernameInput").style.display = "none";

    document.getElementById("inlogButton").style.display = "block";
    document.getElementById("forgotPassword").style.display = "block";
    document.getElementById("register").style.display = "block";

    document.getElementById("forgotPassword").innerHTML = "Paswoord vergeten";
    document.getElementById("register").innerHTML = "Registreren";
    document.getElementById("loginTitle").innerHTML = "Steenbrugge<br>Activiteiten<br>Log in";

    state.send = false;
    state.makeAccount = false;
})

document.getElementById("logOutButton").addEventListener('click', function() {
    localStorage.removeItem("emailAanwezighedenFanfare");
    localStorage.removeItem("eventsAanwezighedenSteenbrugge");
    localStorage.removeItem("infoAanwezighedenSteenbrugge");
    localStorage.removeItem("dataAanwezighedenSteenbrugge");

    window.open(window.location.href, '_top');
})

var startX = null;
var startY = null;
window.addEventListener("touchstart",function(event){
if(event.touches.length === 1){
    //just one finger touched
    startX = event.touches.item(0).clientX;
    startY = event.touches.item(0).clientY;
}else{
    //a second finger hit the screen, abort the touch
    startX = null;
    startY = null;
}
});

window.addEventListener("touchend",function(event){
var offsetX = 100;//at least 100px are a swipe
var offsetY = 100;//at least 100px are a swipe
if(startX){
    //the only finger that hit the screen left it
    var endX = event.changedTouches.item(0).clientX;
    var endY = event.changedTouches.item(0).clientY;

    // console.log(startY - endY);
    if(endX > startX + offsetX && Math.abs(startY - endY) < offsetY){
    //a left -> right swipe
    console.log("swiped left");
    moveToNextPage("left");
    }
    if(endX < startX - offsetX && Math.abs(startY - endY) < offsetY){
    //a right -> left swipe
    console.log("swiped right")
    moveToNextPage("right");
    }
}
});

document.addEventListener('keydown', function (e) {
if (e.code === "ArrowRight"){
    moveToNextPage("right");
} else if (e.code === "ArrowLeft"){
    moveToNextPage("left");
}
});

document.getElementById("toonAllesInput").addEventListener('change', function() {
    state.bulletsDisabled = true;
    document.getElementById('editButton').innerHTML = "Wijzigen"    
    updateEvents(state.data);
})

document.getElementById('editButton').addEventListener('click', function() {
    if(state.data.userData != undefined){
        if(!state.data.readOnly) {
            state.bulletsDisabled = !state.bulletsDisabled;
            if(!state.bulletsDisabled){
                document.getElementById('editButton').innerHTML = "Stop wijzigen"
            } else {
                document.getElementById('editButton').innerHTML = "Wijzigen"
            }
            
            const radioButtons = document.querySelectorAll('input[type="radio"]');
            var cntr = 0;
            radioButtons.forEach(radio => {
                while(state.data.disabledEvents[Math.trunc(cntr/5)] && !document.getElementById("toonAllesInput").checked) {
                    cntr = cntr+5;
                }
                
                if(!radio.checked && state.data.userData[Math.trunc(cntr/5)] != "-" && !state.data.disabledEvents[Math.trunc(cntr/5)]){
                    radio.disabled = state.bulletsDisabled;
                }
    
                cntr++;
            });
        } else {
            alert("Wijzigen is uitgeschakeld door de secretaris.");
      }
    } 
})