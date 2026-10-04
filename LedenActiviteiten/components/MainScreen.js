const MainScreen = {
  template: `
    <div class="container main-container" id="main" v-show="!loading" :class="{ active: !loading }">
      <div class="d-flex justify-content-between align-items-start mb-3">
        <div id="score_edit">
          <button id="editButton" class="btn btn-warning mb-2" @click="toggleEdit" v-show="state.data && !state.data.readOnly">
            {{ state.bulletsDisabled ? 'Wijzigen' : 'Stop wijzigen' }}
          </button>
          <div id="score" class="fw-bold">Aanwezig: /</div>
        </div>
        
        <div id="logOut_email" class="text-end">
          <button id="logOutButton" class="btn btn-danger mb-2" @click="logout" style="display: inline;">Log Out</button>
          <div id="email" class="small">{{ state.email }}</div>
        </div>
      </div>

      <div class="form-check mb-3 position-absolute" style="left: 10px; top: 12vh;">
        <input class="form-check-input" type="checkbox" id="toonAllesInput" v-model="toonAlles" @change="toggleToonAlles">
        <label class="form-check-label" for="toonAllesInput">Toon alles</label>
      </div>

      <div id="breaksForMobile" class="d-none d-lg-block"><br></div>

      <div class="header text-center mb-4" id="mainTitle">
        <h1 id="title">Activiteiten</h1>
      </div>

      <div class="events" id="events">
        <div class="event-header d-none d-md-grid grid-cols-6 gap-2">
          <div></div>
          <span class="text-center">Aanwezig</span>
          <span class="text-center">Waarschijnlijk<br>Aanwezig</span>
          <span class="text-center">Geen Idee</span>
          <span class="text-center">Waarschijnlijk<br>Afwezig</span>
          <span class="text-center">Afwezig</span>
        </div>
      </div>
    </div>
  `,
  setup() {
    const { logout, state } = useAuth();
    const toonAlles = ref(false);

    const toggleToonAlles = () => {
      state.bulletsDisabled = true;
      toonAlles.value = !toonAlles.value;
      updateEvents(state.data);
    };

    const toggleEdit = () => {
      if (state.data?.userData) {
        if (!state.data.readOnly) {
          state.bulletsDisabled = !state.bulletsDisabled;
          
          const radioButtons = document.querySelectorAll('input[type="radio"]');
          let cntr = 0;
          radioButtons.forEach(radio => {
            while (state.data.disabledEvents[Math.trunc(cntr/5)] && !document.getElementById('toonAllesInput').checked) {
              cntr = cntr + 5;
            }
            if (!radio.checked && state.data.userData[Math.trunc(cntr/5)] != '-' && !state.data.disabledEvents[Math.trunc(cntr/5)]) {
              radio.disabled = state.bulletsDisabled;
            }
            cntr++;
          });
        } else {
          alert('Wijzigen is uitgeschakeld door de secretaris.');
        }
      }
    };

    return { logout, state, toonAlles, toggleToonAlles, toggleEdit };
  }
};