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
      enemySkinSelect: document.getElementById("arenaEnemySkinSelect"),
      backgroundSkinSelect: document.getElementById("arenaBackgroundSkinSelect"),
      mute: document.getElementById("arenaMuteBtn"),
      reset: document.getElementById("arenaResetBtn")
    };

    elements.mute.addEventListener("click", options.onToggleMute);
    elements.reset.addEventListener("click", options.onReset);
    elements.skinSelect.addEventListener("change", function () {
      options.onSetClickSkin(elements.skinSelect.value);
    });
    elements.enemySkinSelect.addEventListener("change", function () {
      options.onSetEnemySkin(elements.enemySkinSelect.value);
    });
    elements.backgroundSkinSelect.addEventListener("change", function () {
      options.onSetBackgroundSkin(elements.backgroundSkinSelect.value);
    });

    ARENA.CLICK_EFFECT_SKINS.forEach(function (skin) {
      var option = document.createElement("option");
      option.value = skin.id;
      option.textContent = skin.name;
      elements.skinSelect.appendChild(option);
    });
    ARENA.ENEMY_SKINS.forEach(function (skin) {
      var option = document.createElement("option");
      option.value = skin.id;
      option.textContent = skin.name;
      elements.enemySkinSelect.appendChild(option);
    });
    ARENA.BACKGROUND_SKINS.forEach(function (skin) {
      var option = document.createElement("option");
      option.value = skin.id;
      option.textContent = skin.name;
      elements.backgroundSkinSelect.appendChild(option);
    });

    function update(state, combo) {
      elements.energy.textContent = ARENA.formatNumber(state.energy);
      elements.wave.textContent = ARENA.formatNumber(state.wave);
      elements.defeated.textContent = ARENA.formatNumber(state.totalDefeated);
      elements.combo.textContent = combo > 1 ? combo + "x" : "0x";
      elements.mute.textContent = "Sound: " + (state.muted ? "OFF" : "ON");
      elements.skinSelect.value = state.activeClickSkin;
      elements.enemySkinSelect.value = state.activeEnemySkin;
      elements.backgroundSkinSelect.value = state.activeBackgroundSkin;

      Array.from(elements.skinSelect.options).forEach(function (option) {
        option.disabled = !state.unlockedClickSkins[option.value];
      });
      Array.from(elements.enemySkinSelect.options).forEach(function (option) {
        option.disabled = !state.unlockedEnemySkins[option.value];
      });
      Array.from(elements.backgroundSkinSelect.options).forEach(function (option) {
        option.disabled = !state.unlockedBackgroundSkins[option.value];
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
