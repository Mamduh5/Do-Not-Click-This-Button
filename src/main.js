(function () {
  "use strict";

  window.addEventListener("load", function () {
    if (!window.Phaser) {
      document.getElementById("consoleLog").textContent = "> Phaser failed to load.";
      return;
    }

    var controller = DNC.bindDomUi();

    var tickScene = {
      key: "DomTickScene",
      create: function () {
        this.time.addEvent({
          delay: 250,
          loop: true,
          callback: function () {
            controller.tick(0.25);
          }
        });

        this.time.addEvent({
          delay: 5000,
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
