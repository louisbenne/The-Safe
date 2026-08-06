(function () {
  'use strict';
  const TOKEN_KEY = 'the_safe_token';
  function _getToken() {
    try { return localStorage.getItem(TOKEN_KEY); } catch (e) { return null; }
  }
  window.theSafeAuth = window.theSafeAuth || {};
  window.theSafeAuth.getAuthHeader = function () {
    const t = _getToken();
    return t ? { Authorization: 'Bearer ' + t } : {};
  };
})();
