(function () {
  "use strict";

  window.ARENA = window.ARENA || {};

  ARENA.BALANCE_CONFIG = {
    saveVersion: 1,
    saveKey: "containmentSwarmSave",

    initialState: {
      energy: 0,
      wave: 1,
      elapsedSeconds: 0,
      totalDefeated: 0,
      muted: false,
      upgrades: {}
    },

    canvas: {
      width: 960,
      height: 620,
      background: 0xf4f7f8
    },

    core: {
      maxHealth: 100,
      radius: 24,
      damagedFlashMs: 120,
      rebootHealthRatio: 0.65
    },

    enemy: {
      baseHealth: 3,
      baseSpeed: 22,
      speedVariance: 0.28,
      baseReward: 2,
      radius: 9,
      visualScale: 1.25,
      clickPadding: 8,
      fillColor: 0xe84848,
      hitColor: 0xffffff,
      outlineColor: 0x9f1f1f,
      outlineAlpha: 0.8,
      outlineWidth: 2,
      shadowColor: 0x4d1111,
      shadowAlpha: 0.22,
      spawnIntervalMs: 850,
      minimumSpawnIntervalMs: 280,
      spawnBurst: 1,
      spawnMargin: 34,
      maxEnemies: 70,
      contactDamage: 8,
      hitFlashMs: 90,
      knockback: 24,
      knockbackDecay: 0.82,
      wiggleAmplitude: 16,
      wiggleSpeed: 0.004,
      directionChangeMs: 900,
      turnStrength: 0.75,
      spawnFadeMs: 180,
      spawnRingMs: 260,
      waveEverySeconds: 24,
      waveHealthScale: 0.35,
      waveSpeedScale: 0.08,
      waveRewardScale: 0.15
    },

    cursor: {
      clickDamage: 2,
      clickRadius: 24,
      doubleTapChance: 0,
      shockRadius: 0,
      shockDamage: 1,
      comboWindowMs: 1300,
      helperCursors: 0,
      helperClickIntervalMs: 1450,
      helperClickDamage: 1,
      helperClickRadius: 18,
      helperTravelSpeed: 260,
      helperMaxTravelDurationMs: 1100,
      helperRetreatDistance: 72,
      helperWanderRadius: 150,
      helperWanderSpeed: 92,
      helperTargetReacquireDelayMs: 170,
      helperClickEffectScale: 0.62,
      feedbackScale: 1
    },

    feedback: {
      floatingTextMs: 640,
      impactMs: 180,
      missImpactScale: 0.62,
      hitImpactScale: 1,
      killImpactScale: 1.45,
      shockImpactScale: 1.25,
      cursorFlashSize: 12,
      cursorFlashMs: 90,
      hitParticleCount: 5,
      hitParticleDistance: 16,
      splatterParticleCount: 10,
      splatterMs: 360,
      enemyPopMs: 120,
      killRingMs: 220,
      screenFlashEnabled: true,
      screenFlashMs: 120,
      comboMilestone: 5,
      comboFlashAlpha: 0.12,
      comboPopupMs: 620,
      comboPopupBaseScale: 0.85,
      comboPopupMaxScale: 1.65,
      comboMilestones: [5, 10, 25],
      comboColors: [
        { threshold: 2, color: 0x2a2a2a },
        { threshold: 5, color: 0xd82626 },
        { threshold: 10, color: 0xff8a24 },
        { threshold: 25, color: 0xffd447 }
      ],
      comboPulseEnabled: true,
      comboPulseAlpha: 0.1,
      comboPulseMs: 170
    },

    backgroundEffects: {
      maxDecals: 42,
      fadeMs: 4200,
      defaultAlpha: 0.16,
      defaultRadius: 22,
      lineWidth: 2
    },

    destructibleBackground: {
      enabled: true,
      useRenderTexture: true,
      maxDamageMarks: 80,
      maxTemporaryChunks: 90,
      surfaceAlpha: 1,
      underlayerAlpha: 1,
      brushScale: 1,
      repairDelayMs: 900,
      repairDurationMs: 1200,
      surfaceColor: 0xf4f7f8,
      surfaceGridColor: 0xd9e2e6,
      surfaceBorderColor: 0xbac8ce,
      surfaceDetailColor: 0x9caeb6,
      underlayerColor: 0x252c31,
      underlayerCrackColor: 0x11181d,
      underlayerGlowColor: 0x8f2a3a,
      underlayerGridAlpha: 0.22,
      gridSize: 48,
      borderInset: 18,
      coreRingRadius: 64,
      underlayerDepth: -19,
      surfaceDepth: -18,
      repairDepth: -17,
      fallbackDamageDepth: -16,
      fallbackDamageAlpha: 0.34,
      repairPatchAlpha: 0.98
    },

    autosaveMs: 5000,

    audio: {
      masterVolume: 0.22,
      clickMissVolume: 0.12,
      hitVolume: 0.13,
      killVolume: 0.2,
      upgradeVolume: 0.24,
      helperClickVolume: 0.12,
      comboTickVolume: 0.1,
      coreDamageVolume: 0.26,
      waveVolume: 0.2,
      sounds: {
        clickMiss: { frequency: 180, endFrequency: 120, durationSeconds: 0.04, type: "triangle" },
        hit: { frequency: 150, endFrequency: 70, durationSeconds: 0.055, type: "sawtooth" },
        kill: { frequency: 260, endFrequency: 62, durationSeconds: 0.11, type: "sawtooth" },
        upgrade: { frequency: 620, endFrequency: 980, durationSeconds: 0.13, type: "sine" },
        helperClick: { frequency: 420, endFrequency: 260, durationSeconds: 0.045, type: "square" },
        comboTick: { frequency: 520, endFrequency: 720, durationSeconds: 0.045, type: "triangle" },
        coreDamage: { frequency: 120, endFrequency: 48, durationSeconds: 0.18, type: "sawtooth" },
        wave: { frequency: 280, endFrequency: 520, durationSeconds: 0.16, type: "square" }
      }
    }
  };
})();
