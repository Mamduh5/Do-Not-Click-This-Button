(function () {
  "use strict";

  window.ARENA = window.ARENA || {};

  ARENA.ENEMY_SKINS = [
    {
      id: "ant",
      name: "Ant",
      unlockedByDefault: true,
      bodyColor: 0x161312,
      accentColor: 0x2b201e,
      hitColor: 0xff5757,
      deathColor: 0x222222,
      outlineColor: 0x000000,
      legColor: 0x191919,
      scale: 1,
      shadowScale: 1.05,
      animation: {
        forwardAngleOffset: 0,
        rotationSmoothing: 0.2,
        bodyWobbleAmount: 0.035,
        bodyWobbleSpeed: 0.018,
        legAnimationSpeed: 0.026,
        legAnimationAmplitude: 4.2,
        hitSquashDurationMs: 90,
        hitSquashScaleX: 1.32,
        hitSquashScaleY: 0.68,
        deathPopScale: 1.22,
        deathFadeMs: 120
      },
      ant: {
        segmentCount: 3,
        headRadius: 0.46,
        thoraxRadius: 0.5,
        abdomenRadius: 0.68,
        waistWidth: 0.16,
        antennaLength: 0.72,
        legPairs: 3
      }
    },
    {
      id: "eyes",
      name: "Eyes",
      unlockedByDefault: true,
      bodyColor: 0xf7fbff,
      accentColor: 0x2c8bff,
      hitColor: 0xff7777,
      deathColor: 0xffffff,
      outlineColor: 0x94a8b8,
      pupilColor: 0x111111,
      veinColor: 0xe84848,
      scale: 1.08,
      shadowScale: 1.05,
      animation: {
        forwardAngleOffset: 0,
        rotationSmoothing: 0.12,
        bodyWobbleAmount: 0.055,
        bodyWobbleSpeed: 0.012,
        pupilOffset: 0.24,
        hitSquashDurationMs: 90,
        hitSquashScaleX: 1.22,
        hitSquashScaleY: 0.76,
        deathPopScale: 1.15,
        deathFadeMs: 120
      }
    },
    {
      id: "tank",
      name: "Tank",
      unlockedByDefault: true,
      bodyColor: 0x48515a,
      accentColor: 0x252b31,
      hitColor: 0xb8c7d3,
      deathColor: 0x6a737c,
      outlineColor: 0x1b2025,
      scale: 1.08,
      shadowScale: 1.12,
      animation: {
        forwardAngleOffset: 0,
        rotationSmoothing: 0.08,
        bodyWobbleAmount: 0.012,
        bodyWobbleSpeed: 0.009,
        treadAnimationSpeed: 0.018,
        hitSquashDurationMs: 95,
        hitSquashScaleX: 1.18,
        hitSquashScaleY: 0.82,
        deathPopScale: 1.12,
        deathFadeMs: 130
      }
    },
    {
      id: "tree",
      name: "Tree",
      unlockedByDefault: true,
      bodyColor: 0x6f4327,
      accentColor: 0x2f9a53,
      hitColor: 0xa6e58d,
      deathColor: 0x4cb96d,
      outlineColor: 0x2e452d,
      leafColor: 0x58c46f,
      scale: 1.06,
      shadowScale: 1.08,
      animation: {
        forwardAngleOffset: 0,
        rotationSmoothing: 0.1,
        bodyWobbleAmount: 0.045,
        bodyWobbleSpeed: 0.011,
        leanAmount: 0.18,
        hitSquashDurationMs: 100,
        hitSquashScaleX: 1.18,
        hitSquashScaleY: 0.78,
        deathPopScale: 1.16,
        deathFadeMs: 140
      }
    },
    {
      id: "hat",
      name: "Hat",
      unlockedByDefault: true,
      bodyColor: 0x2e2a38,
      accentColor: 0x8f55ff,
      hitColor: 0xd8c8ff,
      deathColor: 0x8f55ff,
      outlineColor: 0x191620,
      scale: 1.06,
      shadowScale: 1.08,
      animation: {
        forwardAngleOffset: 0,
        rotationSmoothing: 0.16,
        bodyWobbleAmount: 0.08,
        bodyWobbleSpeed: 0.016,
        bounceAmount: 1.8,
        hitSquashDurationMs: 90,
        hitSquashScaleX: 1.24,
        hitSquashScaleY: 0.72,
        deathPopScale: 1.14,
        deathFadeMs: 120
      }
    }
  ];
})();
