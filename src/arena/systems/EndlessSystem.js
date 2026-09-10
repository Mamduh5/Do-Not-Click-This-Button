(function () {
  "use strict";
  var C = ARENA.BALANCE_CONFIG.endless;
  function fresh() { return { pressure: 0, core: ARENA.BALANCE_CONFIG.core.maxHealth, attack: 0, stagger: 0, bossHealth: 1, trainingBoss: 0, lastClearReward: 0, round: 0, modules: [], offers: [] }; }
  function validate(raw) {
    var s = raw || {}, out = fresh();
    Object.keys(out).forEach(function (key) {
      if (typeof out[key] === "number" && Number.isFinite(s[key])) { out[key] = Math.max(0, s[key]); }
    });
    out.pressure = Math.min(100, out.pressure); out.core = Math.min(100, out.core); out.bossHealth = Math.min(1, out.bossHealth);
    out.round = Math.floor(out.round); out.trainingBoss = Math.floor(out.trainingBoss);
    ["modules", "offers"].forEach(function (key) {
      out[key] = Array.isArray(s[key]) ? s[key].filter(function (id, i, ids) {
        return ids.indexOf(id) === i && C.modules.some(function (m) { return m.id === id; });
      }).slice(0, C.slots) : [];
    });
    return out;
  }
  function ensure(state) { if (!state.endless) { state.endless = fresh(); } return state.endless; }
  function traits(wave) {
    var cycle = Math.floor((wave - 1) / C.cycleLength);
    var list = [C.bossTraits[cycle % C.bossTraits.length]];
    if (cycle + 1 >= C.multiTraitCycle) { list.push(C.bossTraits[(cycle + 1) % C.bossTraits.length]); }
    return list;
  }
  function has(state, id) { return ensure(state).modules.indexOf(id) >= 0; }
  function applyStats(state, stats) {
    var e = ensure(state), scale = Math.pow(C.powerGrowth, Math.floor(state.highestWaveCleared / C.cycleLength));
    ["clickDamage", "helperClickDamage", "shockDamage"].forEach(function (k) { stats[k] *= scale; });
    e.modules.forEach(function (id) {
      var def = C.modules.find(function (m) { return m.id === id; });
      Object.keys(stats).forEach(function (k) { if (typeof def[k] === "number") { stats[k] *= def[k]; } });
    });
  }
  function cleared(state, first) {
    var e = ensure(state);
    e.lastClearReward = first ? ARENA.Waves.getDefinition(state.wave).clearReward : 0;
    if (first && state.wave >= C.draftFirstWave && (state.wave % C.draftEveryWaves === 0 || state.wave % C.cycleLength === 0) && !e.offers.length) {
      var pool = C.modules.filter(function (m) { return e.modules.indexOf(m.id) < 0; });
      while (e.offers.length < 3 && pool.length) { e.offers.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0].id); }
    }
  }
  function choose(state, id) {
    var e = ensure(state);
    if (state.wavePhase !== "cleared" || e.offers.indexOf(id) < 0) { return false; }
    e.modules[e.round % C.slots] = id; e.round++; e.offers = []; return true;
  }
  function startWave(state) {
    var e = ensure(state);
    e.trainingBoss = 0; e.core = ARENA.BALANCE_CONFIG.core.maxHealth - e.pressure * C.preparationCorePenalty; e.attack = 0; e.stagger = 0; e.bossHealth = 1;
    if (state.wave % C.cycleLength === 1) { e.pressure = 0; e.core = 100; }
  }
  function setupBoss(scene, enemy) {
    var e = ensure(scene.state), cycle = Math.floor((scene.state.wave - 1) / C.cycleLength);
    enemy.gigaboss = true;
    enemy.maxHealth = C.bossHealth * Math.pow(C.healthGrowth, cycle);
    enemy.health = enemy.maxHealth * e.bossHealth;
    enemy.x = scene.core.x; enemy.y = scene.core.y - C.bossOffsetY;
    enemy.speed = 0; enemy.reward *= C.bossRewardMultiplier;
  }
  function hit(scene, enemy, amount, source) {
    var e = ensure(scene.state);
    if (source === "manual" && has(scene.state, "capacitor")) { scene.state.pulseCharge = Math.min(100, scene.state.pulseCharge + C.capacitorHitCharge); }
    if (!enemy.gigaboss) { return amount; }
    var windup = e.attack >= C.bossAttackSeconds - C.bossWindupSeconds;
    var armored = traits(scene.state.wave).some(function (t) { return t.id === "armor"; });
    if (armored && !windup) { amount *= C.armorDamageRetained; enemy.armorHitUntil = scene.time.now + ARENA.UI_CONFIG.defense.armorHitMs; }
    if (windup) {
      e.stagger += amount;
      if (source === "pulse" || e.stagger >= enemy.maxHealth * C.interruptFraction) {
        e.attack = 0; e.stagger = 0;
        if (has(scene.state, "control")) { e.core = Math.min(100, e.core + C.controlCoreRepair); }
        scene.bossBreakUntil = scene.time.now + ARENA.UI_CONFIG.defense.breakMs;
        if (scene.soundSystem) { scene.soundSystem.play("hit"); }
        scene.hud.log("BREAK");
      }
    }
    return amount;
  }
  function fail(scene) {
    scene.state.wavePhase = "failed";
    // Keep the enemies in place so the battlefield still explains the loss.
    scene.defeatRevealAt = scene.time.now + ARENA.BALANCE_CONFIG.operations.defeatRevealDelayMs;
    scene.combo = 0;
    scene.hud.log(failureReason(scene.state));
    ARENA.Save.save(scene.state); scene.refreshUi();
  }
  function failureReason(state) {
    return ensure(state).core <= 0 ? "CORE DESTROYED / GIGABOSS STRIKE" : "OVERRUN 100% / TOO MANY ENEMIES LEFT ALIVE";
  }
  function retry(scene, training) {
    if (scene.state.wavePhase !== "failed") { return; }
    scene.enemies.forEach(function (enemy) {
      if (enemy.shadow && enemy.shadow.active) { enemy.shadow.destroy(); }
      enemy.destroy();
    });
    scene.enemies = []; scene.defeatRevealAt = 0; scene.coreHitUntil = 0;
    var target = scene.state.wave, e = ensure(scene.state);
    if (training && target % C.cycleLength === 0) { scene.state.wave = target - 1; }
    scene.state.waveKills = 0; scene.state.wavePhase = "active";
    startWave(scene.state);
    e.pressure = 0; e.core = 100;
    e.trainingBoss = training && target % C.cycleLength === 0 ? target : 0;
    scene.waveSystem = ARENA.Waves.create(scene.state); scene.spawnAccumulatorMs = 0;
    ARENA.Save.save(scene.state); scene.refreshUi();
  }
  function tick(scene, seconds) {
    var state = scene.state, e = ensure(state);
    if (state.wavePhase !== "active") { return; }
    var active = scene.enemies.filter(function (enemy) { return enemy.active; }), boss = active.find(function (enemy) { return enemy.gigaboss; });
    if (boss) {
      e.bossHealth = Math.max(0, boss.health / boss.maxHealth);
      e.attack += seconds * (1 + Math.max(0, active.length - 1) * C.summonHaste);
      if (e.attack >= C.bossAttackSeconds) {
        e.core = Math.max(0, e.core - C.bossDamage * (traits(state.wave).some(function (t) { return t.id === "siege"; }) ? C.siegeDamageMultiplier : 1)); e.attack = 0; e.stagger = 0;

        scene.coreHitUntil = scene.time.now + ARENA.BALANCE_CONFIG.operations.coreStrikeFeedbackMs;
        if (traits(state.wave).some(function (t) { return t.id === "swarm"; }) && active.length < C.summonActiveLimit) {
          scene.summonUntil = scene.time.now + ARENA.UI_CONFIG.defense.summonMs;
          scene.summonTargets = [];
          for (var i = 0; i < C.summonCount; i++) { var add = ARENA.Enemies.spawn(scene, state.wave, "runner"); add.reward = 0; scene.enemies.push(add); scene.summonTargets.push({ x: add.x, y: add.y }); }
        }
      }
      if (e.core <= 0) { fail(scene); }
    } else if (state.wave % C.cycleLength !== 0 && state.wave >= C.pressureFirstWave) {
      var max = ARENA.Waves.getDefinition(state.wave).maxActive;
      var crowded = active.length / max >= C.pressureThreshold;
      e.pressure = Math.max(0, Math.min(100, e.pressure + seconds * (crowded ? C.pressureRate * (has(state, "control") ? C.modules.find(function (m) { return m.id === "control"; }).pressure : 1) : -C.pressureRecovery)));
      if (e.pressure >= 100) { fail(scene); }
    }
  }
  ARENA.Endless = { fresh: fresh, validate: validate, ensure: ensure, traits: traits, applyStats: applyStats, cleared: cleared, choose: choose, startWave: startWave, setupBoss: setupBoss, hit: hit, tick: tick, retry: retry, failureReason: failureReason };
})();
