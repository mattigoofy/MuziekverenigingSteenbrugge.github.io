import { createApp, ref, onMounted, watch, computed } from 'vue';
import { state, OPTIONS, OPTION_LABELS } from './store.js';
import { useAuth } from './composables/useAuth.js';
import { setEvents, visibleEvents, openEvent, openNext, openPrevious, setScore } from './events.js';

const app = createApp({
  setup() {
    const { login, logout, resetPassword, register, error, loading } = useAuth();
    const loginEmail = ref('');
    const loginPassword = ref('');
    const username = ref('');
    const isLoginMode = ref(true);
    const toonAlles = ref(state.toonAlles);

    // Sync toonAlles from store
    watch(() => state.toonAlles, (val) => toonAlles.value = val);

    const loadTitle = async () => {
      const response = await fetch(state.scriptURL + '?par=getTitle');
      const data = await response.json();
      document.getElementById('title').innerHTML = data;
    };

    const loadScore = async () => {
      const response = await fetch(state.scriptURL + '?par=getScore&email=' + state.email);
      const data = await response.json();
      setScore(data.score, data.total, data.background);
    };

    const initializeApp = async () => {
      state.currentView = 'loading';
      try {
        await loadTitle();
      } catch (err) {
        console.error('Error fetching title:', err);
      }

      try {
        const response = await fetch(state.scriptURL + '?par=getSpreadsheetData&email=' + state.email);
        state.data = await response.json();

        if (state.data.events.length == 0 && state.data.userData.length == 0) {
          state.currentView = 'main';
          alert('Dit email zit nog niet in de lijst.\n->Als dit een nieuw account is zal je moeten wachten op de secretaris\n->als dit een oud account is heb je waarschijnlijk een fout email, gelieve in te loggen met het juiste email');
        } else {
          setEvents(state.data);
          localStorage.setItem('dataAanwezighedenSteenbrugge', JSON.stringify(state.data));
          state.currentView = 'main';
        }
      } catch (err) {
        console.error('Error:', err);
      }

      try {
        await loadScore();
      } catch (err) {
        console.error('Error:', err);
      }
    };

    onMounted(async () => {
      if (state.email != null) {
        await initializeApp();
      }

      const data = JSON.parse(localStorage.getItem('dataAanwezighedenSteenbrugge'));
      if (data != null && data != 'null') {
        state.data = data;
        setEvents(state.data);
      }

      // Listen for event changes from events.js
      const handler = (e) => {
        if (e.detail) {
          setEvents(e.detail);
        }
      };
      window.addEventListener('LedenActiviteiten:eventsChanged', handler);

      // Deep link event from URL
      const URLevent = decodeURIComponent(window.location.href.split('event=')[1]);
      if (URLevent) {
        const containers = document.getElementsByClassName('container');
        for (let i = 0; i < containers.length; i++) {
          let containerID = containers[i].id.split('info_')[1];
          if (containerID != undefined) {
            containerID = containerID.replaceAll('<br>', ' ');
            if (containerID == URLevent) {
              containers[i].classList.add('active');
              containers[0].classList.remove('active');
              break;
            }
          }
        }
      }
    });

    // Expose visibleEvents as computed
    const visibleEventsList = computed(() => {
      if (!state.data || !state.data.events) return [];
      return state.data.events.filter((e, i) => !state.data.disabledEvents[i] || state.toonAlles);
    });

    const handleLogin = async () => {
      loading.value = true;
      error.value = null;
      try {
        await login(loginEmail.value, loginPassword.value);
        await initializeApp();
      } catch (err) {
        error.value = err.message;
      } finally {
        loading.value = false;
      }
    };

    const handleForgotPassword = async () => {
      if (!state.send) {
        state.send = true;
        isLoginMode.value = false;
      } else {
        if (loginEmail.value) {
          await resetPassword(loginEmail.value);
          state.send = false;
          isLoginMode.value = true;
        } else {
          alert('Geef een email adres in');
        }
      }
    };

    const handleRegister = async () => {
      if (!state.makeAccount) {
        state.makeAccount = true;
        isLoginMode.value = false;
      } else {
        if (loginEmail.value && username.value) {
          await register(loginEmail.value, username.value);
          state.makeAccount = false;
          isLoginMode.value = true;
        }
      }
    };

    const goBack = () => {
      state.send = false;
      state.makeAccount = false;
      isLoginMode.value = true;
    };

    const toggleToonAlles = () => {
      state.bulletsDisabled = true;
      state.toonAlles = !state.toonAlles;
      toonAlles.value = state.toonAlles;
      // Trigger re-render
      window.dispatchEvent(new CustomEvent('LedenActiviteiten:eventsChanged', { detail: state.data }));
    };

    const toggleEdit = () => {
      if (state.data?.userData) {
        if (!state.data.readOnly) {
          state.bulletsDisabled = !state.bulletsDisabled;
        } else {
          alert('Wijzigen is uitgeschakeld door de secretaris.');
        }
      }
    };

    const handleRadioChange = async (eventName, option) => {
      fetch(state.scriptURL + '?par=updateSpreadsheet&email=' + state.email + '&eventName=' + eventName + '&option=' + option)
        .then(response => response.json())
        .then(data => {
          setScore(data.score, data.total, data.background);
        })
        .catch(error => console.error('Error:', error));

      const index = state.data.events.indexOf(eventName.replaceAll('<br>', '\n'));
      state.data.userData[index] = option;
      localStorage.setItem('dataAanwezighedenSteenbrugge', JSON.stringify(state.data));
    };

    return {
      state,
      OPTIONS,
      OPTION_LABELS,
      loginEmail,
      loginPassword,
      username,
      isLoginMode,
      toonAlles,
      visibleEventsList,
      error,
      loading,
      handleLogin,
      handleForgotPassword,
      handleRegister,
      goBack,
      toggleToonAlles,
      toggleEdit,
      handleRadioChange,
      openEvent,
      openNext,
      openPrevious,
      logout
    };
  }
});

app.mount('#app');