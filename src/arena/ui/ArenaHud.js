(function () {
  "use strict";

  window.ARENA = window.ARENA || {};

  function createArenaHud(options) {
    var elements = {
      energy: document.getElementById("arenaEnergy"),
      wave: document.getElementById("arenaWave"),
      defeated: document.getElementById("arenaDefeated"),
      combo: document.getElementById("arenaCombo"),
      log: document.getElementById("arenaLog"),
      skinSelect: document.getElementById("arenaSkinSelect"),
      mute: document.getElementById("arenaMuteBtn"),
      reset: document.getElementById("arenaResetBtn")
    };

    elements.mute.addEventListener("click", options.onToggleMute);
    elements.reset.addEventListener("click", options.onReset);
    elements.skinSelect.addEventListener("change", function () {
      options.onSetClickSkin(elements.skinSelect.value);
    });

    ARENA.CLICK_EFFECT_SKINS.forEach(function (skin) {
      var option = document.createElement("option");
      option.value = skin.id;
      option.textContent = skin.name;
      elements.skinSelect.appendChild(option);
    });

    function update(state, combo) {
      elements.energy.textContent = ARENA.formatNumber(state.energy);
      elements.wave.textContent = ARENA.formatNumber(state.wave);
      elements.defeated.textContent = ARENA.formatNumber(state.totalDefeated);
      elements.combo.textContent = combo > 1 ? combo + "x" : "0x";
      elements.mute.textContent = "Sound: " + (state.muted ? "OFF" : "ON");
      elements.skinSelect.value = state.activeClickSkin;

      Array.from(elements.skinSelect.options).forEach(function (option) {
        option.disabled = !state.unlockedClickSkins[option.value];
      });
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
