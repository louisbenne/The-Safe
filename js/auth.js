/* js/auth.js — Minimal auth UI + token helpers for THE SAFE
   Provides: auth.getToken(), auth.setToken(), auth.logout(), and UI wiring for login/register.
*/
(function () {
  "use strict";

  const TOKEN_KEY = "the_safe_token";

  // Configurable server URL: set window.THE_SAFE_SERVER_URL to override (e.g., http://localhost:4000)
  const SERVER_URL = (typeof window !== 'undefined' && window.THE_SAFE_SERVER_URL) ? window.THE_SAFE_SERVER_URL.replace(/\/$/, '') : '';

  const setToken = (t) => {
    try {
      if (t) localStorage.setItem(TOKEN_KEY, t);
      else localStorage.removeItem(TOKEN_KEY);
    } catch (e) {
      console.error("auth.setToken", e);
    }
  };

  const getToken = () => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch (e) {
      return null;
    }
  };

  const getAuthHeader = () => {
    const t = getToken();
    return t ? { Authorization: `Bearer ${t}` } : {};
  };

  const logout = () => {
    setToken(null);
    updateUi(null);
  };

  const updateUi = (user) => {
    const userEl = document.getElementById("currentUserDisplay");
    const loginBtn = document.getElementById("loginBtn");
    const registerBtn = document.getElementById("registerBtn");
    const logoutBtn = document.getElementById("logoutBtn");
    const importSection = document.getElementById("serverImportSection");
    if (userEl) userEl.textContent = user && user.email ? user.email : "";
    const loggedIn = !!getToken();
    if (loginBtn) loginBtn.hidden = loggedIn;
    if (registerBtn) registerBtn.hidden = loggedIn;
    if (logoutBtn) logoutBtn.hidden = !loggedIn;
    if (importSection) importSection.hidden = !loggedIn;
  };

  async function doLogin(email, password) {
    try {
      const url = SERVER_URL ? SERVER_URL + '/api/auth/login' : '/api/auth/login';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const txt = await res.text();
        let msg = res.statusText || 'Login failed';
        try {
          const j = JSON.parse(txt);
          msg = j.error || j.message || msg;
        } catch (e) {}
        throw new Error(msg);
      }
      const data = await res.json();
      setToken(data.token);
      updateUi(data.user || { email });
      return data;
    } catch (err) {
      console.error('login error', err);
      throw err;
    }
  }

  async function doRegister(email, password) {
    try {
      const url = SERVER_URL ? SERVER_URL + '/api/auth/register' : '/api/auth/register';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const txt = await res.text();
        let msg = res.statusText || 'Registration failed';
        try {
          const j = JSON.parse(txt);
          msg = j.error || j.message || msg;
        } catch (e) {}
        throw new Error(msg);
      }
      const data = await res.json();
      setToken(data.token);
      updateUi(data.user || { email });
      return data;
    } catch (err) {
      console.error('register error', err);
      throw err;
    }
  }

  // Wire up header buttons (if present) and the new modal auth form
  document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    // Modal elements (added to index.html)
    const authModal = document.getElementById('authModal');
    const authModeLabel = document.getElementById('authModeLabel');
    const authEmail = document.getElementById('authEmail');
    const authPassword = document.getElementById('authPassword');
    const authConfirmWrap = document.getElementById('authConfirmWrap');
    const authConfirmPassword = document.getElementById('authConfirmPassword');
    const authError = document.getElementById('authError');
    const authSubmitBtn = document.getElementById('authSubmitBtn');
    const authCloseBtn = document.getElementById('authCloseBtn');

    function openAuthModal(mode) {
      if (!authModal) return;
      authModal.dataset.mode = mode || 'login';
      authModeLabel.textContent = mode === 'register' ? 'Register' : 'Login';
      if (authConfirmWrap) authConfirmWrap.style.display = mode === 'register' ? '' : 'none';
      authError.textContent = '';
      authEmail.value = '';
      authPassword.value = '';
      if (authConfirmPassword) authConfirmPassword.value = '';
      authModal.style.display = 'flex';
      authEmail.focus();
    }

    function closeAuthModal() {
      if (!authModal) return;
      authModal.style.display = 'none';
    }

    // Basic validators
    function validEmail(em) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em);
    }

    function showAuthError(msg) {
      if (authError) authError.textContent = msg || '';
    }

    if (loginBtn) loginBtn.addEventListener('click', () => openAuthModal('login'));
    if (registerBtn) registerBtn.addEventListener('click', () => openAuthModal('register'));
    if (logoutBtn) logoutBtn.addEventListener('click', () => { logout(); updateUi(); });

    if (authCloseBtn) authCloseBtn.addEventListener('click', closeAuthModal);

    if (authSubmitBtn) {
      authSubmitBtn.addEventListener('click', async (ev) => {
        ev && ev.preventDefault && ev.preventDefault();
        const mode = authModal && authModal.dataset.mode ? authModal.dataset.mode : 'login';
        const email = authEmail && authEmail.value ? authEmail.value.trim() : '';
        const password = authPassword && authPassword.value ? authPassword.value : '';
        const confirm = authConfirmPassword && authConfirmPassword.value ? authConfirmPassword.value : '';

        if (!validEmail(email)) return showAuthError('Enter a valid email address');
        if (!password || password.length < 8) return showAuthError('Password must be at least 8 characters');
        if (mode === 'register' && password !== confirm) return showAuthError('Passwords do not match');

        showAuthError('');
        authSubmitBtn.disabled = true;
        try {
          if (mode === 'register') {
            await doRegister(email, password);
          } else {
            await doLogin(email, password);
          }
          closeAuthModal();
          updateUi();
        } catch (err) {
          var msg = (err && err.message) ? err.message : 'Server error';
          showAuthError(msg);
          console.error('auth submit error', err);
        } finally {
          authSubmitBtn.disabled = false;
        }
      });
    }

    // Initialise UI state from token
    updateUi();
  });

  window.theSafeAuth = {
    setToken,
    getToken,
    getAuthHeader,
    logout,
    doLogin,
    doRegister,
  };
})();
