import { ref } from 'vue';
import { state } from './store.js';
import { auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from './firebase.js';

export function useAuth() {
  const error = ref(null);
  const loading = ref(false);
  const send = ref(false);
  const makeAccount = ref(false);

  // Sync with store
  watch(() => state.send, (val) => send.value = val);
  watch(() => state.makeAccount, (val) => makeAccount.value = val);

  const login = async (email, password) => {
    loading.value = true;
    error.value = null;
    try {
      await signInWithEmailAndPassword(auth, email, password);
      state.email = email;
      localStorage.setItem('emailAanwezighedenFanfare', email);
      return true;
    } catch (err) {
      error.value = err.message;
      return false;
    } finally {
      loading.value = false;
    }
  };

  const register = async (email, password) => {
    loading.value = true;
    error.value = null;
    try {
      // Use provided password or generate one if not provided
      const pass = password || Math.floor((Math.random() * 1000000) + 100000);
      await createUserWithEmailAndPassword(auth, email, pass);
      // Notify backend
      const username = prompt('Voer een gebruikersnaam in:');
      if (username) {
        await fetch(state.scriptURL + '?par=notifyNewRegister&email=' + email + '&username=' + username);
      }
      // Send password reset email
      await sendPasswordResetEmail(auth, email);
      alert('Account aangemaakt! Je ontvangt een e-mail om je wachtwoord in te stellen.');
      return true;
    } catch (err) {
      error.value = err.message;
      return false;
    } finally {
      loading.value = false;
    }
  };

  const resetPassword = async (email) => {
    loading.value = true;
    error.value = null;
    try {
      await sendPasswordResetEmail(auth, email);
      alert('Wachtwoord reset e-mail verzonden!');
      return true;
    } catch (err) {
      error.value = err.message;
      return false;
    } finally {
      loading.value = false;
    }
  };

  const logout = () => {
    state.email = null;
    state.data = null;
    localStorage.removeItem('emailAanwezighedenFanfare');
    localStorage.removeItem('dataAanwezighedenSteenbrugge');
    window.open(window.location.href, '_top');
  };

  return {
    login,
    register,
    resetPassword,
    logout,
    error,
    loading,
    send,
    makeAccount
  };
}