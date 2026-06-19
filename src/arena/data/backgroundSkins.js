(function () {
  "use strict";

  window.ARENA = window.ARENA || {};

  ARENA.BACKGROUND_SKINS = [
    {
      id: "containmentFloor",
      name: "Containment Floor",
      unlockedByDefault: true,
      surface: {
        baseColor: 0xf4f7f8,
        tileColor: 0xf9fbfc,
        gridColor: 0xd9e2e6,
        seamColor: 0xbac8ce,
        detailColor: 0x9caeb6,
        subtleNoise: true,
        noiseColor: 0xe5ecef,
        noiseAlpha: 0.18,
        noiseCellSize: 24,
        gridSize: 48,
        borderInset: 18,
        coreRingRadius: 64
      },
      underlayer: {
        color: 0x232a30,
        crackColor: 0x10161b,
        glowColor: 0x8f2a3a,
        voidColor: 0x07090d,
        gridAlpha: 0.2
      },
      repair: {
        mode: "repaint",
        delayMs: 900,
        durationMs: 1200
      },
      damageResponses: {
        groundBreak: {
          type: "localizedCollapse",
          collapseRadius: 28,
          chunkCountMin: 5,
          chunkCountMax: 8,
          chunkSizeMin: 9,
          chunkSizeMax: 18,
          chunkShiftDistance: 14,
          centerGapRadius: 8,
          shortCrackCount: 7,
          shortCrackLengthMin: 8,
          shortCrackLengthMax: 22,
          maxCrackDistanceFromCenter: 30,
          crackJaggedness: 0.35,
          crackEraseWidth: 3,
          crackShadowWidth: 2,
          shadowColor: 0x11171b,
          highlightColor: 0xffffff,
          dustCount: 18,
          repairDelayMs: 1050,
          repairDurationMs: 1500,
          shakeIntensity: 0
        },
        pixelShatter: {
          type: "localGridBreak",
          cellSize: 7,
          gridWidthCells: 9,
          gridHeightCells: 7,
          centerDamageChance: 0.92,
          edgeBreakChance: 0.26,
          edgeDamageFalloff: 0.48,
          chunkCount: 24,
          chunkSize: 6,
          chunkTravelDistance: 54,
          localFlickerCount: 8,
          localFlickerDurationMs: 190,
          repairMode: "cell",
          repairDelayMs: 820,
          repairDurationMs: 1450,
          glitchColors: [0xaa2a2a, 0x19d8ff, 0x2a2a2a],
          glitchAlpha: 0.46
        },
        meteor: {
          type: "scorch",
          radius: 18,
          repairDelayMs: 850,
          repairDurationMs: 1200,
          underlayerColor: 0x351d17,
          detailColor: 0x6a2b18
        },
        laser: {
          type: "burn",
          radius: 10,
          lineLength: 28,
          repairDelayMs: 650,
          repairDurationMs: 900,
          underlayerColor: 0x123843,
          detailColor: 0x19d8ff
        },
        arrowRain: {
          type: "punctures",
          count: 5,
          radius: 24,
          holeRadius: 3,
          repairDelayMs: 720,
          repairDurationMs: 900,
          underlayerColor: 0x2a211a,
          detailColor: 0x6f4a25
        },
        paper: {
          enabled: false,
          type: "none"
        }
      }
    }
  ];

  function get(id) {
    return ARENA.BACKGROUND_SKINS.find(function (skin) {
      return skin.id === id;
    }) || ARENA.BACKGROUND_SKINS[0];
  }

  function getDefaultSkinId() {
    return ARENA.BACKGROUND_SKINS[0].id;
  }

  function getDefaultUnlocked() {
    var unlocked = {};
    ARENA.BACKGROUND_SKINS.forEach(function (skin) {
      if (skin.unlockedByDefault) {
        unlocked[skin.id] = true;
      }
    });
    return unlocked;
  }

  function ensureState(state) {
    if (!state.unlockedBackgroundSkins || typeof state.unlockedBackgroundSkins !== "object") {
      state.unlockedBackgroundSkins = getDefaultUnlocked();
    }

    Object.keys(getDefaultUnlocked()).forEach(function (id) {
      state.unlockedBackgroundSkins[id] = true;
    });

    if (!state.activeBackgroundSkin || !state.unlockedBackgroundSkins[state.activeBackgroundSkin]) {
      state.activeBackgroundSkin = getDefaultSkinId();
    }
  }

  ARENA.BackgroundSkins = {
    get: get,
    getDefaultSkinId: getDefaultSkinId,
    getDefaultUnlocked: getDefaultUnlocked,
    ensureState: ensureState
  };
})();
