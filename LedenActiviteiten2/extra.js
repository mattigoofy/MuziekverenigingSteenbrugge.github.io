/*
* Overview *
*----------*
*- firebase
    - setup
    - login
    - forgot_password
    - register
    - email_send_function
*- logged_in
*- create_event
*- extra_functies
*- eventHandlers
*- main
*/

////////////////////////////////////////////////////////////////////////
// firebase                                                           //
////////////////////////////////////////////////////////////////////////

//
// setup
//
// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail  } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyCiIYRu6jwvoZS3KRczNIuB7leNbfgZRZI",
    authDomain: "aanwezigheden-steenbrugge.firebaseapp.com",
    projectId: "aanwezigheden-steenbrugge",
    storageBucket: "aanwezigheden-steenbrugge.appspot.com",
    messagingSenderId: "794040098578",
    appId: "1:794040098578:web:66973bf6682e9054081dcb",
    measurementId: "G-87Q7NMTT04"
// apiKey: "AIzaSyBN0-mmwFIYRLWCUiFp-1lJXQpdCMnOV0U",
//     authDomain: "aanwezighedenfanfare.firebaseapp.com",
//     projectId: "aanwezighedenfanfare",
//     storageBucket: "aanwezighedenfanfare.appspot.com",
//     messagingSenderId: "486933575166",
//     appId: "1:486933575166:web:8da79d5545a93e9eb73caf",
//     measurementId: "G-N4QYBM1TEL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const scriptURL = "https://script.google.com/macros/s/AKfycbxZnLV4jeG1e-124oRXeYH6EL5ugfMPsrg-ORNUR8l68OlA00lLd0YXKVnD9BtMGv23/exec";



//
// login
//
document.getElementById("inlogButton").addEventListener('click', function() {
email = document.getElementById("emailInput").value;
let password = document.getElementById("passwordInput").value;

signInWithEmailAndPassword(auth, email, password).then(u => {
    loggedIn();
})
.catch(error => {
    switch (error.code) {
    case 'auth/invalid-password':
        alert(`Fout wachtwoord, probeer opnieuw.`);
        break;
    case 'auth/invalid-email':
        alert(`Email adres ${email} is ongeldig.`);
        break;
    case 'auth/invalid-credential':
        alert(`Als je nog geen account hebt, ga dan eens gaan praten met de secretaris.`);
        break;
    case 'auth/auth/user-not-found':
        alert('Als je nog geen account hebt, ga dan eens gaan praten met de secretaris.');
        break;
    default:
        console.log(error.message);
        alert("Er ging iets fout, probeer opnieuw")
        break;
    }
});
});



//
// forgot_password
//
var send = false;
document.getElementById('forgotPassword').addEventListener('click', function(event) {
    event.preventDefault();
    
    if(!send){
        document.getElementById("register").style.display = "none";
        document.getElementById("passwordLabel").style.display = "none";
        document.getElementById("passwordInput").style.display = "none";
        document.getElementById("inlogButton").style.display = "none";
        document.getElementById("loginBackButton").style.display = "block";
        document.getElementById("forgotPassword").innerHTML = "Verzend email";
        document.getElementById("loginTitle").innerHTML = "<br><br>Paswoord vergeten";
        send = true;
    }else{
        var email = document.getElementById("emailInput").value;
    
        if(email != ""){
            sendPasswordEmail(email);
        
            document.getElementById("register").style.display = "block";
            document.getElementById("passwordLabel").style.display = "block";
            document.getElementById("passwordInput").style.display = "block";
            document.getElementById("inlogButton").style.display = "block";
            document.getElementById("loginBackButton").style.display = "none";
            document.getElementById("forgotPassword").innerHTML = "Paswoord vergeten";
            document.getElementById("loginTitle").innerHTML = "Steenbrugge<br>Activiteiten<br>Log in";
            send = false;
        } else {
            alert("Geef een email adres in")
        }
    }
});



//
// register
//
var makeAccount = false;
document.getElementById("register").addEventListener('click', function(event) {
event.preventDefault();
if(!makeAccount){
    document.getElementById("usernameLabel").style.display = "block";
    document.getElementById("usernameInput").style.display = "block";
    document.getElementById("loginBackButton").style.display = "block";
    document.getElementById("passwordLabel").style.display = "none";
    document.getElementById("passwordInput").style.display = "none";
    document.getElementById("forgotPassword").style.display = "none";
    document.getElementById("inlogButton").style.display = "none";
    document.getElementById("register").innerHTML = "Account maken";
    document.getElementById("loginTitle").innerHTML = "<br><br>Account aanmaken";
    makeAccount = true;

} else {
    email = document.getElementById("emailInput").value;
    let password = Math.floor((Math.random() * 1000000) + 100000);
    let username = document.getElementById("usernameInput").value;

    createUserWithEmailAndPassword(auth, email, password).then(u => {})
    .catch(error => {
        switch (error.code) {
        case 'auth/email-already-in-use':
        alert(`Email adres ${email} is al in gebruik.`);
        break;
        case 'auth/invalid-email':
        alert(`Email adres ${email} is niet geldig.`);
        break;
        case 'auth/operation-not-allowed':
        alert(`Er ging iets fout.`);
        break;
        case 'auth/weak-password':
        alert('Password is niet sterk genoeg. Voeg extra karakters toe.');
        break;
        default:
        console.log(error.message);
        alert("Er ging iets fout, probeer opnieuw")
        break;
        }
    });

    auth.onAuthStateChanged(async function() {
    if(auth.currentUser != null){  
        fetch(scriptURL + '?par=notifyNewRegister&email=' + email + '&username=' + username)
        .then(response => response.json())
        .then(data => {
            // notification sent
        })
        .catch(error => console.error('Error:', error));
        
        alert("Uw account is succesvol aangemaakt. U ontvangt zo dadelijk een e-mail waarmee u uw wachtwoord kunt instellen. Gelieve ook uw spam- of ongewenste e-mail te controleren indien u de mail niet meteen terugvindt.");
        sendPasswordEmail(email);
    }
    })

    document.getElementById("usernameLabel").style.display = "none";
    document.getElementById("usernameInput").style.display = "none";
    document.getElementById("loginBackButton").style.display = "none";
    document.getElementById("passwordLabel").style.display = "block";
    document.getElementById("passwordInput").style.display = "block";
    document.getElementById("forgotPassword").style.display = "block";
    document.getElementById("inlogButton").style.display = "block";
    document.getElementById("register").innerHTML = "Registreren";
    document.getElementById("loginTitle").innerHTML = "Steenbrugge<br>Activiteiten<br>Log in";
    makeAccount = true;
}
})



//
// email_send_function
//
function sendPasswordEmail(email) {
    sendPasswordResetEmail(auth, email)
    .then(() => {
        // Password reset email sent!
        alert('U ontvangt zo dadelijk een e-mail waarmee u uw wachtwoord opnieuw kunt instellen. Gelieve ook uw spam- of ongewenste e-mail te controleren indien u de mail niet meteen terugvindt.');
    })
    .catch((error) => {
        var errorCode = error.code;
        var errorMessage = error.message;
        alert('Er is een fout opgetreden ${errorCode}: ${errorMessage}');
    });
}





////////////////////////////////////////////////////////////////////////
// logged_in                                                          //
////////////////////////////////////////////////////////////////////////

function loggedIn() {
    document.getElementById("main").style.display = "block";
    document.getElementById("login").style.display = "none";    // weg met loginscherm
    document.getElementById("loadingText").style.display = "block";    // kom met laden
    localStorage.setItem("emailAanwezighedenFanfare", email);   // email lokaal opslaan

    // Juiste titel zetten
    fetch(scriptURL + '?par=getTitle')
    .then(response => response.json())
    .then(data => {
        document.getElementById("title").innerHTML = data;
    })
    .catch(error => console.error('Error:', error));

    // email plaatsen
    document.getElementById("email").innerHTML = email;

    fetch(scriptURL + '?par=getSpreadsheetData&email=' + email)
    .then(response => response.json())
    .then(scriptdata => {      // events halen uit spreadsheet
        data = scriptdata;
        if(data.events.length == 0 && data.userData.length == 0){
            document.getElementById("loadingText").style.display = "none";
            alert("Dit email zit nog niet in de lijst.\n->Als dit een nieuw account is zal je meoeten wachten op de secretaris\n->als dit een oud account is heb je waarschijnlijk een fout email, gelieve in te loggen met het juiste email");
        } else {
            updateEvents(data);

            localStorage.setItem("dataAanwezighedenSteenbrugge", JSON.stringify(data));
            document.getElementById("editButton").style.display = "block";
            document.getElementById("loadingText").style.display = "none";

            if(data.readOnly){
                // document.getElementById("editButton").disabled = true;
                document.getElementById("editButton").classList.add("disabled");
            }
        }
    })
    .catch(error => console.error('Error:', error));
    document.getElementById("toonAllesLabel").style.display = "flex";

    fetch(scriptURL + '?par=getScore&email=' + email)
    .then(response => response.json())
    .then(data => {
        updateScore(email, data);
    })
    .catch(error => console.error('Error:', error));
}





////////////////////////////////////////////////////////////////////////
// create_event                                                       //
////////////////////////////////////////////////////////////////////////

function createEvent(eventName, userValue, eventInfo) {

    // create event for aanweigheden
    const eventsContainer = document.querySelector('.events');

    const eventTitle = document.createElement('a');
    eventTitle.className = 'event-title';
    eventTitle.href = '#';
    eventTitle.innerHTML = eventName;
    eventTitle.addEventListener('click', (event) => {
        event.preventDefault();
        document.getElementById("main").style.display = "none";
        document.getElementById("info_"+eventName).style.display = "grid";

    });
    eventsContainer.appendChild(eventTitle);


    const options = ['X', 'X?', '?', 'O?', 'O'];
    options.forEach(option => {
        const radioGroup = document.createElement('div');
        radioGroup.classList.add('radio-group');

        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = `event${eventName}`;
        radio.value = option;
        if (option === userValue) {
            radio.checked = true;
        } else {
            radio.disabled = true;
        }
        radio.addEventListener('change', function() {
            fetch(scriptURL + '?par=updateSpreadsheet&email=' + email + '&eventName=' + eventName + '&option=' + option)
            .then(response => response.json())
            .then(data => {
                updateScore(email, data);
            })
            .catch(error => console.error('Error:', error));

            // update local storage
            var index = data.events.indexOf(eventName.replaceAll("<br>", "\n"));
            data.userData[index] = option;
            localStorage.setItem("dataAanwezighedenSteenbrugge", JSON.stringify(data));
        });
        radioGroup.appendChild(radio);
        eventsContainer.appendChild(radioGroup);
    });


    // create event voor info
    const event = document.createElement("div");
    event.className = "container";
    event.id = "info_" + eventName;
    event.style.display = "none";

    const homeButton = document.createElement("button");
    homeButton.className = "homeButton";
    homeButton.textContent = "HOME";
    homeButton.addEventListener('click', function() {
        document.getElementById("main").style.display = "grid";
        document.getElementById("info_" + eventName).style.display = "none";
    })

    const nextButton = document.createElement("button");
    nextButton.className = "nextButton";
    nextButton.textContent = ">";
    nextButton.id = "nextButton_" + eventName;
    nextButton.addEventListener('click', function() { moveToNextPage("right"); });

    const previousButton = document.createElement("button");
    previousButton.className = "previousButton";
    previousButton.textContent = "<";
    previousButton.id = "previousButton_" + eventName;
    previousButton.addEventListener('click', function() { moveToNextPage("left"); });

    const header = document.createElement("div");
    header.className = "header";

    const title = document.createElement("h1");
    title.innerHTML = eventName;

    const information = document.createElement("span");
    information.className = "infoEvent";
    information.innerHTML = eventInfo;

    header.appendChild(title);
    header.appendChild(document.createElement("br"));
    header.appendChild(document.createElement("br"));

    event.appendChild(homeButton);
    if(data != null) {
        if(data.events != null){
        if(data.events.indexOf(eventName.replaceAll("<br>", "\n")) != data.events.length-1){
            event.appendChild(nextButton);
        }
        }
    }
    event.appendChild(previousButton);
    event.appendChild(header);
    event.appendChild(information);

    document.body.appendChild(event);

}




////////////////////////////////////////////////////////////////////////
// extra_functies                                                     //
////////////////////////////////////////////////////////////////////////

//
// om naar volgende pagina te kunnen gaan
//
function moveToNextPage(direction){        
    const containers = document.getElementsByClassName("container");
    var current;
    var next;
    for(let i=0;i<containers.length; i++){
        if(containers[i].style.display == "grid"){
            current = containers[i];

            if(direction == "left"){
                next = containers[i-1];
            } else if(direction == "right"){
                next = containers[i+1];
            }
        }
    }

    if(next != undefined && current != undefined){
        current.style.display = "none";
        next.style.display = "grid";
    }
}



//
//  update score
//
function updateScore(email, data) {
    document.getElementById("score").innerHTML = "Aanwezig: " + data.score + "/" + data.total;  
    document.getElementById("score").style.color = data.background;
}



//
//  update events
//
function updateEvents(data) {
    // clear current events
    var events = document.getElementsByClassName("event-title");
    var length = events.length;
    for(let i=1; i < length; i++){
        events[1].remove();
    }
    events = document.getElementsByClassName("radio-group");
    length = events.length;
    for(let i=0; i < length; i++){
        events[0].remove();
    }

    // clear events info
    var containers = document.getElementsByClassName("container");
    var currentlyWatching;
    length = containers.length;
    for(let i=1; i < length; i++){
        if(containers[1].style.display == "grid"){
            currentlyWatching = containers[1].id;
        }
        containers[1].remove();
    }

    // add new events
    for (let i = 0; i < data.events.length; i++) {
        if(!data.disabledEvents[i] || document.getElementById("toonAllesInput").checked) {
            createEvent(data.events[i].replaceAll("\n","<br>"), data.userData[i], data.info[i].replaceAll("\n", "<br>"));
        }

        if(currentlyWatching != undefined){
            if("info_" + data.events[i].replaceAll("\n","<br>") == currentlyWatching){
                document.getElementById(currentlyWatching).style.display = "grid";
            }
        } else {
            document.getElementById("main").style.display = "grid";
        }
    }
}





////////////////////////////////////////////////////////////////////////
// eventHandlers                                                      //
////////////////////////////////////////////////////////////////////////

//
// loginBackButton
//
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

    send = false;
    makeAccount = false;
})

//
// log out button event handler
//
document.getElementById("logOutButton").addEventListener('click', function() {
    localStorage.removeItem("emailAanwezighedenFanfare");
    localStorage.removeItem("eventsAanwezighedenSteenbrugge");
    localStorage.removeItem("infoAanwezighedenSteenbrugge");
    localStorage.removeItem("dataAanwezighedenSteenbrugge");

    window.open(window.location.href, '_top');
})

//
// om te kunnen swipen
//
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



//
// keylistener arrows
//
document.addEventListener('keydown', function (e) {
if (e.code === "ArrowRight"){
    moveToNextPage("right");
} else if (e.code === "ArrowLeft"){
    moveToNextPage("left");
}
});



//
// toonAlles_checkbox
//
document.getElementById("toonAllesInput").addEventListener('change', function() {
    bulletsDisabled = true;
    document.getElementById('editButton').innerHTML = "Wijzigen"    
    updateEvents(data);
})



//
// Wijzig knop 
//
let bulletsDisabled = true;
document.getElementById('editButton').addEventListener('click', function() {
    if(data.userData != undefined){
        if(!data.readOnly) {
            bulletsDisabled = !bulletsDisabled;
            if(!bulletsDisabled){
                document.getElementById('editButton').innerHTML = "Stop wijzigen"
            } else {
                document.getElementById('editButton').innerHTML = "Wijzigen"
            }
            
            const radioButtons = document.querySelectorAll('input[type="radio"]');
            var cntr = 0;
            radioButtons.forEach(radio => {
                while(data.disabledEvents[Math.trunc(cntr/5)] && !document.getElementById("toonAllesInput").checked) {
                    cntr = cntr+5;
                }
                
                if(!radio.checked && data.userData[Math.trunc(cntr/5)] != "-" && !data.disabledEvents[Math.trunc(cntr/5)]){
                    radio.disabled = bulletsDisabled;
                }
    
                cntr++;
            });
        } else {
            alert("Wijzigen is uitgeschakeld door de secretaris.");
      }
    } 
});





////////////////////////////////////////////////////////////////////////
// main                                                               //
////////////////////////////////////////////////////////////////////////
var url;

//
// checken als lokaal al eens is ingelogd
//
let email = localStorage.getItem("emailAanwezighedenFanfare");
if(email != null){
    loggedIn();
}



//
// checken voor lokale events
//
var data = JSON.parse(localStorage.getItem("dataAanwezighedenSteenbrugge"));
if(data != null && data != "null"){
    updateEvents(data);
}



// 
// URL ophalen
//
url = scriptURL;
document.getElementById("logOutButton").style.display = "inline";



//
// choose events using url
//
// use: page.html?event=<event_id>
let URLevent = decodeURIComponent(window.location.href.split("event=")[1]);
const containers = document.getElementsByClassName("container");
for(let i=0;i<containers.length; i++){
    let containerID = containers[i].id.split("info_")[1];
    if(containerID != undefined) {
        containerID = containerID.replaceAll("<br>", " ");
        if(containerID == URLevent){
            containers[i].style.display = "grid";
            containers[0].style.display = "none";
            break;
        }
    }
}
