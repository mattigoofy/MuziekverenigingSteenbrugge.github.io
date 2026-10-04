const LoginForm = {
  template: `
    <div id="login" class="login-screen">
      <a href="#" id="loginBackButton" class="back-link" @click.prevent="goBack" v-show="!isLoginMode">Naar Log in</a>
      
      <h1 id="loginTitle" class="text-center mb-4">
        <span v-if="isLoginMode">Steenbrugge<br>Activiteiten<br>Log in</span>
        <span v-else-if="state.send"><br><br>Paswoord vergeten</span>
        <span v-else-if="state.makeAccount"><br><br>Account aanmaken</span>
      </h1>

      <label id="emailLabel" class="form-label">Email</label>
      <input id="emailInput" type="email" class="form-control mb-2" v-model="loginEmail" :disabled="loading">
      
      <label id="passwordLabel" class="form-label" v-show="isLoginMode">Password</label>
      <input id="passwordInput" type="password" class="form-control mb-2" v-model="loginPassword" v-show="isLoginMode" :disabled="loading">
      
      <label id="usernameLabel" class="form-label" v-show="state.makeAccount && !isLoginMode">Naam</label>
      <input id="usernameInput" type="text" class="form-control mb-2" v-show="state.makeAccount && !isLoginMode" v-model="username" :disabled="loading">

      <button id="inlogButton" class="btn btn-primary w-100 mb-2" @click="handleLogin" v-show="isLoginMode" :disabled="loading">
        <span v-if="loading">Bezig...</span><span v-else>Log in</span>
      </button>
      
      <a href="#" id="forgotPassword" class="text-center mb-2 d-block" @click.prevent="handleForgotPassword" v-show="isLoginMode && !state.send">Paswoord vergeten</a>
      <a href="#" id="register" class="text-center mb-2 d-block" @click.prevent="handleRegister" v-show="isLoginMode && !state.makeAccount">Registreren</a>

      <button class="btn btn-success w-100 mb-2" @click="handleForgotPassword" v-show="!isLoginMode && state.send">Verzend email</button>
      <button class="btn btn-success w-100 mb-2" @click="handleRegister" v-show="!isLoginMode && state.makeAccount">Account maken</button>

      <div v-if="error" class="alert alert-danger mt-3">{{ error }}</div>
    </div>
  `,
  setup() {
    const { login, register, resetPassword, state, error, loading } = useAuth();
    const loginEmail = ref('');
    const loginPassword = ref('');
    const username = ref('');
    const isLoginMode = ref(true);

    const goBack = () => { state.send = false; state.makeAccount = false; isLoginMode.value = true; };
    const handleLogin = () => login(loginEmail.value, loginPassword.value);
    const handleForgotPassword = () => {
      if (!state.send) { state.send = true; isLoginMode.value = false; }
      else { if (loginEmail.value) { resetPassword(loginEmail.value); state.send = false; isLoginMode.value = true; } else alert('Geef een email adres in'); }
    };
    const handleRegister = () => {
      if (!state.makeAccount) { state.makeAccount = true; isLoginMode.value = false; }
      else { if (loginEmail.value) { register(loginEmail.value, loginPassword.value); state.makeAccount = false; isLoginMode.value = true; } }
    };

    return { loginEmail, loginPassword, username, isLoginMode, state, error, loading, goBack, handleLogin, handleForgotPassword, handleRegister };
  }
};