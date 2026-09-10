(function () {
  "use strict";

  window.ARENA = window.ARENA || {};
  var CONFIG = ARENA.BALANCE_CONFIG;
  var OPERATIONS = CONFIG.operations;

  function getDefinition(wave) {
    var scaledWave = Math.min(wave, OPERATIONS.scalingWaveCap);
    var cycle = Math.floor((wave - 1) / CONFIG.endless.cycleLength) + 1;
    var champion = wave % OPERATIONS.championEveryWaves === 0;
    var index = (wave - 1) % OPERATIONS.titles.length;
    return {
      wave: wave,
      cycle: cycle,
      target: champion ? 1 : Math.min(OPERATIONS.maxQuota, OPERATIONS.baseQuota + (wave - 1) * OPERATIONS.quotaPerWave),
      champion: champion,
      title: champion ? "Gigaboss / Cycle " + cycle : OPERATIONS.titles[index],
      hint: OPERATIONS.hints[index],
      maxActive: Math.min(OPERATIONS.maxConcurrent, OPERATIONS.baseConcurrent + Math.floor((wave - 1) / OPERATIONS.concurrentEveryWaves)),
      spawnIntervalMs: Math.max(CONFIG.enemy.minimumSpawnIntervalMs, CONFIG.enemy.spawnIntervalMs * Math.pow(OPERATIONS.spawnIntervalScale, scaledWave - 1)),
      clearReward: (OPERATIONS.clearRewardBase + scaledWave * OPERATIONS.clearRewardPerWave) * (champion ? OPERATIONS.championRewardMultiplier : 1) * Math.pow(CONFIG.endless.powerGrowth, cycle - 1)
    };
  }

  function create(state) {
    return { spawned: state.waveKills, transitionRemainingMs: transitionDuration(state) };
  }

  function transitionDuration(state) {
    var nextWave = state.endless && state.endless.trainingBoss ? state.endless.trainingBoss : state.wave + 1;
    return getDefinition(nextWave).champion ? OPERATIONS.gigabossTransitionMs : OPERATIONS.nextWaveDelayMs;
  }

  function updateTransition(system, state, deltaMs) {
    if (state.wavePhase !== "cleared") { return false; }
    system.transitionRemainingMs = Math.max(0, system.transitionRemainingMs - deltaMs);
    return system.transitionRemainingMs === 0;
  }

  function nextRole(state, spawned) {
    var definition = getDefinition(state.wave);
    if (definition.champion && spawned === definition.target - 1) {
      return "champion";
    }
    if (definition.cycle > 1 && spawned % 3 === 1) {
      return (definition.cycle + state.wave) % 2 === 0 ? "runner" : "brute";
    }
    var entry = OPERATIONS.roleSchedule.find(function (schedule) {
      return state.wave >= schedule.fromWave && (spawned + 1) % schedule.everySpawns === 0;
    });
    return entry ? entry.role : "standard";
  }

  function canSpawn(system, state, activeCount) {
    var definition = getDefinition(state.wave);
    if (state.wavePhase !== "active" || system.spawned >= definition.target || activeCount >= definition.maxActive) {
      return false;
    }
    // A champion is the finale: ordinary targets must be cleared first.
    return !definition.champion || system.spawned < definition.target - 1 || activeCount === 0;
  }

  function registerKill(system, state, enemy) {
    if (!enemy.operationTarget || enemy.operationWave !== state.wave || enemy.operationCredited || state.wavePhase !== "active") {
      return { counted: false, cleared: false, reward: 0 };
    }
    enemy.operationCredited = true;
    var definition = getDefinition(state.wave);
    state.waveKills = Math.min(definition.target, state.waveKills + 1);
    if (state.waveKills < definition.target) {
      return { counted: true, cleared: false, reward: 0 };
    }
    // Phase and reward are persisted together. Reloading a cleared wave never pays twice.
    state.wavePhase = "cleared";
    system.transitionRemainingMs = transitionDuration(state);
    var firstClear = state.wave > state.highestWaveCleared;
    state.highestWaveCleared = Math.max(state.highestWaveCleared, state.wave);
    if (ARENA.Endless) { ARENA.Endless.cleared(state, firstClear); }
    if (!firstClear) { return { counted: true, cleared: true, reward: 0 }; }
    state.energy += definition.clearReward;
    return { counted: true, cleared: true, reward: definition.clearReward };
  }

  function next(system, state) {
    if (state.wavePhase !== "cleared") {
      return false;
    }
    state.wave = state.endless && state.endless.trainingBoss ? state.endless.trainingBoss : state.wave + 1;
    if (ARENA.Endless) { ARENA.Endless.startWave(state); }
    state.waveKills = 0;
    state.wavePhase = "active";
    system.spawned = 0;
    return true;
  }

  function comboMultiplier(combo) {
    return 1 + Math.min(OPERATIONS.comboRewardMaxBonus, Math.max(0, combo - 1) * OPERATIONS.comboRewardPerKill);
  }

  ARENA.Waves = {
    create: create,
    getDefinition: getDefinition,
    nextRole: nextRole,
    canSpawn: canSpawn,
    registerKill: registerKill,
    next: next,
    comboMultiplier: comboMultiplier,
    updateTransition: updateTransition
  };
})();
