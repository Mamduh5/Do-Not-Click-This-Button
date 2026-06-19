(function () {
  "use strict";

  window.ARENA = window.ARENA || {};

  ARENA.ENEMY_SKINS = [
    {
      id: "ant",
      name: "Ant",
      unlockedByDefault: true,
      bodyColor: 0x5c1714,
      accentColor: 0x8d2a20,
      hitColor: 0xff5757,
      deathColor: 0x6f1e18,
      outlineColor: 0x260908,
      legColor: 0x3a0e0c,
      scale: 0.88,
      shadowScale: 0.94,
      animation: {
        forwardAngleOffset: 0,
        rotationSmoothing: 0.2,
        bodyWobbleAmount: 0.035,
        bodyWobbleSpeed: 0.018,
        legAnimationSpeed: 0.03,
        legAnimationAmplitude: 3.6,
        hitSquashDurationMs: 90,
        hitSquashScaleX: 1.32,
        hitSquashScaleY: 0.68,
        deathPopScale: 1.22,
        deathFadeMs: 120
      },
      ant: {
        segmentCount: 3,
        headRadius: 0.4,
        thoraxRadius: 0.43,
        abdomenRadius: 0.58,
        waistWidth: 0.12,
        antennaLength: 0.68,
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
    },
    {
      id: "worm",
      name: "Worm",
      unlockedByDefault: true,
      bodyColor: 0xc24a5a,
      accentColor: 0xff8a9a,
      hitColor: 0xffb3bf,
      deathColor: 0xd64d61,
      outlineColor: 0x6b1d28,
      scale: 0.98,
      shadowScale: 1,
      animation: {
        forwardAngleOffset: 0,
        rotationSmoothing: 0.18,
        bodyWobbleAmount: 0.075,
        bodyWobbleSpeed: 0.02,
        wormWiggleAmplitude: 0.26,
        wormWiggleFrequency: 0.034,
        hitSquashDurationMs: 110,
        hitSquashScaleX: 1.36,
        hitSquashScaleY: 0.58,
        deathPopScale: 1.2,
        deathFadeMs: 130
      },
      worm: {
        segmentCount: 7,
        segmentSpacing: 0.34,
        segmentRadius: 0.38,
        headRadius: 0.46,
        tailRadius: 0.26,
        colors: [0xff8a9a, 0xe85c70, 0xc24a5a]
      }
    }
  ];
})();
