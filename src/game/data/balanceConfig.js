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
      reducedMotion: false
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
    }
  };
})();
