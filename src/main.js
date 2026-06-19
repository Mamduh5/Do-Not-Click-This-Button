(function () {
  "use strict";

  var config = {
    type: Phaser.AUTO,
    parent: "game",
    backgroundColor: "#07090d",
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: window.innerWidth,
      height: window.innerHeight,
      min: {
        width: 360,
        height: 560
      }
    },
    scene: [DNC.GameScene]
  };

  window.addEventListener("load", function () {
    if (!window.Phaser) {
      document.getElementById("game").textContent = "Phaser failed to load.";
      return;
    }

    new Phaser.Game(config);
  });
})();
