(function () {
  "use strict";

  window.DNC = window.DNC || {};
  var CONFIG = DNC.BALANCE_CONFIG;
  var THRESHOLDS = CONFIG.instability;
  var REWARDS = CONFIG.breachRewards;

  var BAND_COPY = {
    stable: {
      label: "STABLE",
      color: 0x53d86a,
      warning: "Seriously. Do not click it.",
      buttonLabels: ["DO NOT CLICK"]
    },
    disturbed: {
      label: "DISTURBED",
      color: 0xf2b84b,
      warning: "Compliance failure detected.",
      buttonLabels: ["DO NOT CLICK"]
    },
    unstable: {
      label: "UNSTABLE",
      color: 0xff7a3d,
      warning: "Containment integrity falling.",
      buttonLabels: ["DO NOT CLICK", "STOP"]
    },
    critical: {
      label: "CRITICAL",
      color: 0xff3030,
      warning: "Alarm: breach threshold approaching.",
      buttonLabels: ["CLICK AGAIN", "IT WANTS POWER", "JUST ONCE MORE", "DO NOT STOP"]
    },
    breach: {
      label: "BREACH",
      color: 0xffffff,
      warning: "Reality breach detected.",
      buttonLabels: ["BREACH"]
    }
  };

  function getBand(instability) {
    if (instability >= THRESHOLDS.breachAt) {
      return "breach";
    }

    if (instability >= THRESHOLDS.criticalAt) {
      return "critical";
    }

    if (instability >= THRESHOLDS.unstableAt) {
      return "unstable";
    }

    if (instability >= THRESHOLDS.disturbedAt) {
      return "disturbed";
    }

    return "stable";
  }

  function getBandConfig(instability) {
    var band = getBand(instability);
    return Object.assign({ band: band }, BAND_COPY[band]);
  }

  function getShardReward(state) {
    var powerReward = Math.sqrt(state.totalPowerEarned / REWARDS.totalPowerDivisor);
    var repeatReward = state.breachCount * REWARDS.breachCountBonus;
    return Math.max(REWARDS.minimumShards, Math.floor(powerReward + repeatReward));
  }

  DNC.Instability = {
    getBand: getBand,
    getBandConfig: getBandConfig,
    getShardReward: getShardReward
  };
})();
