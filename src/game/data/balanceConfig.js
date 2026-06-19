(function () {
  "use strict";

  window.DNC = window.DNC || {};

  DNC.BALANCE_CONFIG = {
    saveVersion: 1,

    initialState: {
      power: 0,
      totalPowerEarned: 0,
      instability: 0,
      breachCount: 0,
      anomalyShards: 0,
      powerPerClick: 1,
      powerPerSecond: 0,
      instabilityPerClick: 0.65,
      instabilityPerSecond: 0,
      containmentPerSecond: 0,
      totalClicks: 0,
      reducedMotion: false,
      audioEnabled: true
    },

    statCaps: {
      minimumInstabilityPerClick: 0.2,
      maximumInstabilityPerClick: 999,
      minimumInstability: 0,
      maximumInstability: 100
    },

    instability: {
      stableMin: 0,
      stableMax: 24,
      disturbedAt: 25,
      unstableAt: 50,
      criticalAt: 75,
      breachAt: 100
    },

    timing: {
      tickMs: 250,
      autosaveMs: 5000,
      consoleCooldownMs: 1500,
      floatingTextMs: 850,
      reducedMotionFloatingTextMs: 300,
      clickFeedbackMs: 100,
      clickShakeMs: 300,
      breachShakeMs: 320,
      resetConfirmMs: 4000
    },

    console: {
      maxVisibleLines: 4
    },

    shardUi: {
      tabLabel: "SHARD",
      emptyTitle: "No anomaly shards available.",
      emptyHint: "Trigger a containment breach to harvest shards.",
      summaryTitle: "PERMANENT EFFECTS",
      shardLabel: "SHARDS",
      breachLabel: "BREACHES"
    },

    menu: {
      buttonLabel: "MENU",
      title: "SYSTEM MENU",
      closeLabel: "Close",
      soundLabel: "Sound",
      motionLabel: "Motion",
      resetRunLabel: "Reset Current Run",
      deleteSaveLabel: "Delete All Save Data",
      resetRunConfirm: "Reset current run? Permanent shard progress will be kept.",
      deleteSaveConfirm: "Delete all save data? This removes shards, breaches, and permanent upgrades.",
      confirmLabel: "Confirm",
      cancelLabel: "Cancel"
    },

    breachRewards: {
      totalPowerDivisor: 80,
      breachCountBonus: 0.5,
      minimumShards: 1
    },

    feedback: {
      stable: {
        shake: false
      },
      disturbed: {
        shake: true
      },
      unstable: {
        shake: true
      },
      critical: {
        shake: true
      },
      criticalLabelStepFrames: 18
    },

    autoCursor: {
      clickIntervalMs: 1000,
      travelMs: 260,
      pressMs: 120,
      feedbackMs: 700,
      maxVisibleCursors: 1,
      label: "AUTO",
      consoleCooldownMs: 5000
    },

    audio: {
      enabledByDefault: true,
      masterVolume: 0.28,
      clickVolume: 0.35,
      autoClickVolume: 0.18,
      upgradeVolume: 0.25,
      shardUpgradeVolume: 0.24,
      errorVolume: 0.2,
      warningVolume: 0.22,
      breachVolume: 0.42,
      sounds: {
        click: { frequency: 96, endFrequency: 42, durationMs: 75, type: "sawtooth" },
        clickCritical: { frequency: 130, endFrequency: 46, durationMs: 95, type: "square" },
        autoClick: { frequency: 520, endFrequency: 340, durationMs: 45, type: "square" },
        upgrade: { frequency: 640, endFrequency: 920, durationMs: 110, type: "sine" },
        shardUpgrade: { frequency: 740, endFrequency: 1180, durationMs: 180, type: "triangle" },
        error: { frequency: 150, endFrequency: 90, durationMs: 140, type: "sawtooth" },
        warning: { frequency: 440, endFrequency: 260, durationMs: 180, type: "square" },
        breach: { frequency: 120, endFrequency: 38, durationMs: 520, type: "sawtooth" }
      }
    }
  };
})();
