(function () {
  "use strict";

  window.addEventListener("load", function () {
    if (!window.Phaser) {
      document.getElementById("arenaLog").textContent = "PHASER FAILED TO LOAD";
      return;
    }

    var config = ARENA.BALANCE_CONFIG.canvas;

    new Phaser.Game({
      type: Phaser.AUTO,
      parent: "arenaMount",
      width: config.width,
      height: config.height,
      backgroundColor: config.background,
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
      },
      audio: {
        noAudio: true
      },
      scene: [ARENA.ArenaScene]
    });
  });
})();
