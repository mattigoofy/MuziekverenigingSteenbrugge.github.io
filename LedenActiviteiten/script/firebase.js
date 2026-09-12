import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyCiIYRu6jwvoZS3KRczNIuB7leNbfgZRZI",
    authDomain: "aanwezigheden-steenbrugge.firebaseapp.com",
    projectId: "aanwezigheden-steenbrugge",
    storageBucket: "aanwezigheden-steenbrugge.appspot.com",
    messagingSenderId: "794040098578",
    appId: "1:794040098578:web:66973bf6682e9054081dcb",
    measurementId: "G-87Q7NMTT04"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { app, auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail };