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
      background: 0x080c12
    },

    core: {
      maxHealth: 100,
      radius: 24,
      damagedFlashMs: 120,
      rebootHealthRatio: 0.65
    },

    enemy: {
      baseHealth: 4,
      baseSpeed: 34,
      baseReward: 2,
      radius: 8,
      spawnIntervalMs: 1150,
      minimumSpawnIntervalMs: 360,
      spawnBurst: 1,
      spawnMargin: 34,
      contactDamage: 8,
      hitFlashMs: 90,
      waveEverySeconds: 24,
      waveHealthScale: 0.35,
      waveSpeedScale: 0.08,
      waveRewardScale: 0.15
    },

    attack: {
      damage: 2,
      intervalMs: 760,
      range: 320,
      projectileSpeed: 430,
      projectileRadius: 4,
      projectileHitRadius: 13,
      projectileCount: 1,
      pulseDamageMultiplier: 0.45,
      pulseRadius: 58,
      chainRange: 90,
      chainDamageMultiplier: 0.55,
      chainTargets: 0,
      orbiters: 0,
      orbiterRadius: 74,
      orbiterDamage: 1.1,
      orbiterHitRadius: 18,
      orbiterIntervalMs: 420
    },

    feedback: {
      floatingTextMs: 640,
      pulseVisualMs: 260,
      hitLineMs: 95,
      enemyPopMs: 120
    },

    autosaveMs: 5000,

    audio: {
      masterVolume: 0.22,
      attackVolume: 0.16,
      hitVolume: 0.13,
      destroyVolume: 0.2,
      upgradeVolume: 0.24,
      coreDamageVolume: 0.26,
      waveVolume: 0.2
    }
  };
})();
