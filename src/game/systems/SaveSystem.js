(function () {
  "use strict";

  window.DNC = window.DNC || {};

  var SAVE_KEY = "doNotClickThisButtonSave";

  function load() {
    try {
      var raw = window.localStorage.getItem(SAVE_KEY);

      if (!raw) {
        return DNC.createDefaultState();
      }

      return DNC.validateState(JSON.parse(raw));
    } catch (error) {
      console.warn("Save load failed.", error);
      return DNC.createDefaultState();
    }
  }

  function save(state) {
    try {
      state.lastSavedAt = Date.now();
      window.localStorage.setItem(SAVE_KEY, JSON.stringify(state));
      return true;
    } catch (error) {
      console.warn("Save failed.", error);
      return false;
    }
  }

  function reset() {
    try {
      window.localStorage.removeItem(SAVE_KEY);
    } catch (error) {
      console.warn("Save reset failed.", error);
    }

    return DNC.createDefaultState();
  }

  DNC.Save = {
    key: SAVE_KEY,
    load: load,
    save: save,
    reset: reset
  };
})();
