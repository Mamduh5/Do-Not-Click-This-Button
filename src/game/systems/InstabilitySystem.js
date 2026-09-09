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
    return Math.max(REWARDS.minimumShards, Math.floor(Math.sqrt(state.runPowerEarned / REWARDS.totalPowerDivisor)));
  }

  function getForecast(state) {
    var reward = getShardReward(state);
    var repeatReward = 0;
    var nextPower = Math.pow(Math.max(0, reward + 1 - repeatReward), 2) * REWARDS.totalPowerDivisor;
    var previousPower = Math.pow(Math.max(0, reward - repeatReward), 2) * REWARDS.totalPowerDivisor;
    var remainingPower = Math.max(0, nextPower - state.runPowerEarned);
    var intervalPower = Math.max(1, nextPower - previousPower);
    var heatRemaining = Math.max(0, THRESHOLDS.breachAt - state.instability);
    var netInstability = state.instabilityPerSecond - state.containmentPerSecond;
    return {
      shards: reward,
      nextShards: reward + 1,
      remainingPower: remainingPower,
      progress: DNC.clamp(1 - remainingPower / intervalPower, 0, 1),
      clicksToBreach: Math.ceil(heatRemaining / state.instabilityPerClick),
      netInstability: netInstability,
      secondsToBreach: netInstability > 0 ? heatRemaining / netInstability : null
    };
  }

  DNC.Instability = {
    getBand: getBand,
    getBandConfig: getBandConfig,
    getShardReward: getShardReward,
    getForecast: getForecast
  };
})();

(function () {
  "use strict";
  var C = DNC.BALANCE_CONFIG.machine;
  function validate(raw) {
    var s = raw || {}, out = DNC.createDefaultState().machine;
    ["risk", "surge", "round", "nextDraft"].forEach(function (key) {
      if (Number.isFinite(s[key]) && s[key] >= 0) { out[key] = s[key]; }
    });
    out.round = Math.floor(out.round);
    out.nextDraft = Math.max(C.draftFirst, out.nextDraft);
    out.stabilizing = s.stabilizing === true;
    out.rescued = s.rescued === true;
    ["modules", "offers"].forEach(function (key) {
      out[key] = Array.isArray(s[key]) ? s[key].filter(function (id, i, ids) {
        return ids.indexOf(id) === i && C.modules.some(function (m) { return m.id === id; });
      }).slice(0, key === "modules" ? C.slots : 3) : [];
    });
    return out;
  }
  function factors(state) {
    var f = { click: 1, heat: 1, auto: 1, passive: 1, safe: 1, hot: 1, risk: 1, cooling: 1, surge: 1, warning: C.surgeWarningSeconds, retained: C.stabilizeOutput };
    state.machine.modules.forEach(function (id) {
      var m = C.modules.find(function (entry) { return entry.id === id; });
      Object.keys(f).forEach(function (key) {
        if (m[key] !== undefined) { f[key] = key === "warning" ? f[key] + m[key] : key === "retained" ? Math.max(f[key], m[key]) : f[key] * m[key]; }
      });
    });
    return f;
  }
  function multiplier(state, manual) {
    var f = factors(state), danger = state.instability;
    return (1 + C.dangerOutputBonus * Math.pow(danger / 100, 2)) * (manual ? f.click : f.auto) *
      (danger >= C.redline ? f.hot : f.safe) * (state.machine.stabilizing ? f.retained : 1);
  }
  function produce(state, amount, manual) {
    var gain = amount * multiplier(state, manual), f = factors(state);
    state.power += gain; state.totalPowerEarned += gain; state.runPowerEarned += gain;
    if (state.instability >= C.redline && !state.machine.stabilizing) {
      state.machine.risk += gain * (state.instability - C.redline) / (100 - C.redline) * f.risk;
    }
    if (!state.machine.offers.length && state.runPowerEarned >= state.machine.nextDraft) {
      var pool = C.modules.filter(function (m) { return state.machine.modules.indexOf(m.id) === -1 && (state.breachCount > 0 || state.machine.round > 0 || state.instability >= C.redline || ["contact", "governor", "capacitor"].indexOf(m.id) >= 0); });
      // Offers are generated once, then persisted; reloading cannot reroll them.
      while (state.machine.offers.length < 3 && pool.length) {
        state.machine.offers.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0].id);
      }
    }
    return gain;
  }
  function tick(state, seconds) {
    var f = factors(state), m = state.machine;
    produce(state, state.powerPerSecond * seconds, false);
    var heat = state.instabilityPerSecond * f.passive * (m.stabilizing ? f.retained : 1) - state.containmentPerSecond;
    state.instability = DNC.clamp(state.instability + (heat - (m.stabilizing ? C.stabilizeCooling * f.cooling : 0)) * seconds, 0, 100);
    if (state.instability >= C.surgeAt) {
      m.surge += seconds;
      if (m.surge >= f.warning) { state.instability = Math.min(100, state.instability + C.surgeHeat * f.surge); m.surge = 0; }
    } else { m.surge = 0; }
  }
  function choose(state, id) {
    var m = state.machine;
    if (m.offers.indexOf(id) < 0) { return false; }
    m.modules[m.round % C.slots] = id;
    m.round += 1; m.offers = []; m.nextDraft = state.runPowerEarned + C.draftStep * m.round;
    return true;
  }
  function bonus(state) { return Math.floor(Math.sqrt(state.machine.risk / C.riskDivisor)); }
  DNC.Machine = { validate: validate, factors: factors, multiplier: multiplier, produce: produce, tick: tick, choose: choose, bonus: bonus };
})();
