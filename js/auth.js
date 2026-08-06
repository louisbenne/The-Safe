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
      if (!res.ok) throw new Error('login_failed');
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
      if (!res.ok) throw new Error('register_failed');
      const data = await res.json();
      setToken(data.token);
      updateUi(data.user || { email });
      return data;
    } catch (err) {
      console.error('register error', err);
      throw err;
    }
  }

  // Wire up header buttons (if present)
  document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    if (loginBtn) {
      loginBtn.addEventListener('click', async () => {
        const email = prompt('Email for login');
        const password = prompt('Password');
        if (!email || !password) return alert('Email and password required');
        try {
          await doLogin(email, password);
          alert('Logged in');
        } catch (e) {
          alert('Login failed');
        }
      });
    }

    if (registerBtn) {
      registerBtn.addEventListener('click', async () => {
        const email = prompt('Email for registration');
        const password = prompt('Password');
        if (!email || !password) return alert('Email and password required');
        try {
          await doRegister(email, password);
          alert('Registered and logged in');
        } catch (e) {
          alert('Registration failed');
        }
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        logout();
        alert('Logged out');
      });
    }

    // Initialise UI state from token
    // Optionally fetch /api/health or /api/me later to show user info
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
