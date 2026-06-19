(function () {
  "use strict";

  window.addEventListener("load", function () {
    if (!window.Phaser) {
      document.getElementById("consoleLog").textContent = "> Phaser failed to load.";
      return;
    }

    var controller = DNC.bindDomUi();
    var timing = DNC.BALANCE_CONFIG.timing;

    var tickScene = {
      key: "DomTickScene",
      create: function () {
        this.time.addEvent({
          delay: timing.tickMs,
          loop: true,
          callback: function () {
            controller.tick(timing.tickMs / 1000);
          }
        });

        this.time.addEvent({
          delay: timing.autosaveMs,
          loop: true,
          callback: function () {
            controller.save();
          }
        });
      }
    };

    new Phaser.Game({
      type: Phaser.AUTO,
      parent: "phaser-root",
      width: 1,
      height: 1,
      transparent: true,
      audio: {
        noAudio: true
      },
      scene: [tickScene]
    });
  });
})();
