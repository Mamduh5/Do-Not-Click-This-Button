(function () {
  "use strict";

  window.DNC = window.DNC || {};

  function createAutoCursorView(container) {
    var config = DNC.BALANCE_CONFIG.autoCursor;
    var cursor = document.createElement("div");
    var cooldownMs = 0;

    cursor.className = "auto-cursor";
    cursor.innerHTML = "<span class=\"auto-cursor-pointer\">&#9650;</span><span class=\"auto-cursor-label\">" + config.label + "</span>";
    cursor.style.setProperty("--auto-travel-ms", config.travelMs + "ms");
    cursor.style.setProperty("--auto-press-ms", config.pressMs + "ms");
    container.appendChild(cursor);

    function setActive(active) {
      cursor.classList.toggle("active", Boolean(active));
    }

    function playCycle() {
      cursor.classList.remove("cycle");
      cursor.offsetHeight;
      cursor.classList.add("cycle");
      window.setTimeout(function () {
        cursor.classList.remove("cycle");
      }, config.travelMs + config.pressMs);
    }

    function canLog(now) {
      if (now < cooldownMs) {
        return false;
      }

      cooldownMs = now + config.consoleCooldownMs;
      return true;
    }

    return {
      setActive: setActive,
      playCycle: playCycle,
      canLog: canLog
    };
  }

  DNC.createAutoCursorView = createAutoCursorView;
})();
