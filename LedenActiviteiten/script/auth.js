import { auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from "./firebase.js";
import { state } from "./state.js";
import { loggedIn } from "./loggedIn.js";

export { sendPasswordEmail };

document.getElementById("inlogButton").addEventListener('click', function() {
    state.email = document.getElementById("emailInput").value;
    let password = document.getElementById("passwordInput").value;

    signInWithEmailAndPassword(auth, state.email, password).then(u => {
        loggedIn();
    })
    .catch(error => {
        switch (error.code) {
            case 'auth/invalid-password':
                alert(`Fout wachtwoord, probeer opnieuw.`);
                break;
            case 'auth/invalid-email':
                alert(`Email adres ${state.email} is ongeldig.`);
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

document.getElementById('forgotPassword').addEventListener('click', function(event) {
    event.preventDefault();
    
    if(!state.send){
        document.getElementById("register").style.display = "none";
        document.getElementById("passwordLabel").style.display = "none";
        document.getElementById("passwordInput").style.display = "none";
        document.getElementById("inlogButton").style.display = "none";
        document.getElementById("loginBackButton").style.display = "block";
        document.getElementById("forgotPassword").innerHTML = "Verzend email";
        document.getElementById("loginTitle").innerHTML = "<br><br>Paswoord vergeten";
        state.send = true;
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
            state.send = false;
        } else {
            alert("Geef een email adres in")
        }
    }
});

document.getElementById("register").addEventListener('click', function(event) {
    event.preventDefault();
    if(!state.makeAccount){
        document.getElementById("usernameLabel").style.display = "block";
        document.getElementById("usernameInput").style.display = "block";
        document.getElementById("loginBackButton").style.display = "block";
        document.getElementById("passwordLabel").style.display = "none";
        document.getElementById("passwordInput").style.display = "none";
        document.getElementById("forgotPassword").style.display = "none";
        document.getElementById("inlogButton").style.display = "none";
        document.getElementById("register").innerHTML = "Account maken";
        document.getElementById("loginTitle").innerHTML = "<br><br>Account aanmaken";
        state.makeAccount = true;

    } else {
        state.email = document.getElementById("emailInput").value;
        let password = Math.floor((Math.random() * 1000000) + 100000);
        let username = document.getElementById("usernameInput").value;

        createUserWithEmailAndPassword(auth, state.email, password).then(u => {})
        .catch(error => {
            switch (error.code) {
                case 'auth/email-already-in-use':
                    alert(`Email adres ${state.email} is al in gebruik.`);
                    break;
                case 'auth/invalid-email':
                    alert(`Email adres ${state.email} is niet geldig.`);
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
                fetch(state.scriptURL + '?par=notifyNewRegister&email=' + state.email + '&username=' + username)
                .then(response => response.json())
                .then(data => {
                    // notification sent
                })
                .catch(error => console.error('Error:', error));
                
                alert("Uw account is succesvol aangemaakt. U ontvangt zo dadelijk een e-mail waarmee u uw wachtwoord kunt instellen. Gelieve ook uw spam- of ongewenste e-mail te controleren indien u de mail niet meteen terugvindt.");
                sendPasswordEmail(state.email);
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
        state.makeAccount = true;
    }
})

function sendPasswordEmail(email) {
    sendPasswordResetEmail(auth, email)
    .then(() => {
        alert('U ontvangt zo dadelijk een e-mail waarmee u uw wachtwoord opnieuw kunt instellen. Gelieve ook uw spam- of ongewenste e-mail te controleren indien u de mail niet meteen terugvindt.');
    })
    .catch((error) => {
        var errorCode = error.code;
        var errorMessage = error.message;
        alert('Er is een fout opgetreden ${errorCode}: ${errorMessage}');
    });
}