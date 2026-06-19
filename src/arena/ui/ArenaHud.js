(function () {
  "use strict";

  window.ARENA = window.ARENA || {};

  function createArenaHud(options) {
    var elements = {
      energy: document.getElementById("arenaEnergy"),
      wave: document.getElementById("arenaWave"),
      defeated: document.getElementById("arenaDefeated"),
      core: document.getElementById("arenaCore"),
      log: document.getElementById("arenaLog"),
      mute: document.getElementById("arenaMuteBtn"),
      reset: document.getElementById("arenaResetBtn")
    };

    elements.mute.addEventListener("click", options.onToggleMute);
    elements.reset.addEventListener("click", options.onReset);

    function update(state, coreHealth, maxHealth) {
      elements.energy.textContent = ARENA.formatNumber(state.energy);
      elements.wave.textContent = ARENA.formatNumber(state.wave);
      elements.defeated.textContent = ARENA.formatNumber(state.totalDefeated);
      elements.core.textContent = Math.max(0, Math.ceil((coreHealth / maxHealth) * 100)) + "%";
      elements.mute.textContent = "Sound: " + (state.muted ? "OFF" : "ON");
    }

    function log(message) {
      elements.log.textContent = message;
    }

    return {
      update: update,
      log: log
    };
  }

  ARENA.createArenaHud = createArenaHud;
})();
