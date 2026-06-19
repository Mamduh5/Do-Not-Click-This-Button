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
      baseReward: 2,
      radius: 9,
      spawnIntervalMs: 850,
      minimumSpawnIntervalMs: 280,
      spawnBurst: 1,
      spawnMargin: 34,
      contactDamage: 8,
      hitFlashMs: 90,
      knockback: 24,
      wiggleAmplitude: 16,
      wiggleSpeed: 0.004,
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
      helperMoveSpeed: 0.22,
      feedbackScale: 1
    },

    feedback: {
      floatingTextMs: 640,
      impactMs: 180,
      splatterParticleCount: 10,
      splatterMs: 360,
      enemyPopMs: 120
    },

    autosaveMs: 5000,

    audio: {
      masterVolume: 0.22,
      clickMissVolume: 0.12,
      hitVolume: 0.13,
      killVolume: 0.2,
      upgradeVolume: 0.24,
      helperClickVolume: 0.12,
      coreDamageVolume: 0.26,
      waveVolume: 0.2
    }
  };
})();
