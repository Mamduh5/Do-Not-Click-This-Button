(function () {
  "use strict";

  window.ARENA = window.ARENA || {};

  var CONFIG = ARENA.BALANCE_CONFIG;

  function ArenaScene() {
    Phaser.Scene.call(this, { key: "ArenaScene" });
  }

  ArenaScene.prototype = Object.create(Phaser.Scene.prototype);
  ArenaScene.prototype.constructor = ArenaScene;

  var BACKGROUND_ASSETS = [
    { key: "arenaSandBaseMap", path: "assets/arena/backgrounds/sand_base_map.png", group: "sand" },
    { key: "arenaSandDuneOverlay", path: "assets/arena/backgrounds/sand_dune_overlay_stamp.png", group: "sand" },
    { key: "arenaSandDepression", path: "assets/arena/backgrounds/sand_depression_stamp.png", group: "sand" },
    { key: "arenaSandWindStreaks", path: "assets/arena/backgrounds/sand_wind_streaks_overlay.png", group: "sand" },
    { key: "arenaWaterBaseMap", path: "assets/arena/backgrounds/water_base_map.png", group: "water" },
    { key: "arenaWaterSplashCrown", path: "assets/arena/backgrounds/water_splash_crown.png", group: "water" },
    { key: "arenaWaterFoamBurst", path: "assets/arena/backgrounds/water_foam_burst.png", group: "water" },
    { key: "arenaWaterCausticOverlay", path: "assets/arena/backgrounds/water_caustic_overlay.png", group: "water" }
  ];

  ArenaScene.prototype.preload = function () {
    BACKGROUND_ASSETS.forEach(function (asset) {
      this.load.image(asset.key, asset.path);
    }, this);
  };

  ArenaScene.prototype.create = function () {
    this.state = ARENA.Save.load();
    this.stats = ARENA.Upgrades.computeStats(this.state);
    this.soundSystem = ARENA.createSoundSystem(this.state);
    this.enemies = [];
    this.spawnAccumulatorMs = 0;
    this.autosaveAccumulatorMs = 0;
    this.waveSystem = ARENA.Waves.create(this.state);
    this.paused = false;
    this.uiAccumulatorMs = 0;
    this.clearRevealAt = 0;
    this.defeatRevealAt = 0;
    this.coreHitUntil = 0;
    this.combo = 0;
    this.comboExpiresAt = 0;
    this.effectCounts = {};
    this.enemySerial = 0;
    this.spawningEnabled = true;
    this.core = { x: CONFIG.canvas.width / 2, y: CONFIG.canvas.height / 2 };
    this.backgroundAssets = getBackgroundAssetSnapshot(this);

    drawRoom(this);
    this.destructibleBackgroundSystem = ARENA.DestructibleBackground.create(this);
    this.waterSurfaceSystem = ARENA.WaterSurface.create(this, ARENA.BackgroundSkins.get(this.state.activeBackgroundSkin));
    this.obstacleSystem = ARENA.Obstacles.create(this, ARENA.BackgroundSkins.get(this.state.activeBackgroundSkin));
    this.townNavigationSystem = ARENA.TownNavigation.create(this, ARENA.BackgroundSkins.get(this.state.activeBackgroundSkin));
    this.backgroundEffectSystem = ARENA.BackgroundEffects.create(this);
    this.helperCursorSystem = ARENA.HelperCursors.create(this);
    this.pulsePreview = this.add.rectangle(this.core.x, this.core.y, CONFIG.canvas.width - 30, CONFIG.canvas.height - 30);
    this.pulsePreview.setStrokeStyle(CONFIG.operations.pulsePreviewLineWidth, CONFIG.operations.pulseColor, CONFIG.operations.pulsePreviewAlpha);
    this.pulsePreview.setDepth(CONFIG.operations.pulsePreviewDepth);
    var updateReadabilityScale = function () {
      var fieldWidth = this.game.canvas.getBoundingClientRect().width;
      this.enemyReadabilityScale = Math.max(1, Math.min(CONFIG.enemy.smallScreenScaleMax, CONFIG.enemy.readableFieldWidth / Math.max(1, fieldWidth)));
    }.bind(this);
    updateReadabilityScale();
    var fieldResizeObserver = new ResizeObserver(updateReadabilityScale);
    fieldResizeObserver.observe(this.game.canvas);
    this.pulsePreview.setVisible(false);
    this.bossTelegraph = this.add.graphics().setDepth(30);
    this.defenseLabel = this.add.text(CONFIG.canvas.width / 2, 20, "", {
      fontFamily: "Consolas, monospace", fontSize: "20px", color: "#ffffff",
      backgroundColor: "#111c25", padding: { x: 12, y: 8 }, align: "center"
    }).setOrigin(0.5, 0).setDepth(31);
    this.coreLabel = this.add.text(this.core.x, this.core.y + CONFIG.core.radius + 12, "", {
      fontFamily: "Consolas, monospace", fontSize: "18px", color: "#ffffff",
      backgroundColor: "#111c25", padding: { x: 8, y: 5 }
    }).setOrigin(0.5, 0).setDepth(31);
    this.input.on("pointerdown", this.handlePointerDown, this);

    this.hud = ARENA.createArenaHud({
      onReviewUpgrades: function () { if (!this.paused) { this.togglePause(); } }.bind(this),
      onPause: this.togglePause.bind(this),
      onPulse: this.dischargePulse.bind(this),
      onToggleMute: this.toggleMute.bind(this),
      onReset: this.resetPrototype.bind(this),
      onSetClickSkin: this.setClickSkin.bind(this),
      onSetEnemySkin: this.setEnemySkin.bind(this),
      onSetBackgroundSkin: this.setBackgroundSkin.bind(this)
    });
    this.panel = ARENA.createUpgradePanel({
      onBuy: this.buyUpgrade.bind(this)
    });

    this.handleKey = function (event) {
      if (event.repeat || /INPUT|SELECT|TEXTAREA/.test(event.target.tagName)) { return; }
      if (event.code === "Space" && event.target.tagName !== "BUTTON") { event.preventDefault(); this.dischargePulse(); }
      if (event.code === "KeyP") { event.preventDefault(); this.togglePause(); }
    }.bind(this);
    this.handlePageHide = function () { ARENA.Save.save(this.state); }.bind(this);
    this.handleVisibility = function () {
      if (document.hidden && !this.paused && this.state.wavePhase !== "failed") { this.togglePause(); }
    }.bind(this);
    window.addEventListener("keydown", this.handleKey);
    window.addEventListener("pagehide", this.handlePageHide);
    document.addEventListener("visibilitychange", this.handleVisibility);
    this.events.once("shutdown", function () {
      this.soundSystem.destroy();
      fieldResizeObserver.disconnect();
      window.removeEventListener("keydown", this.handleKey);
      window.removeEventListener("pagehide", this.handlePageHide);
      document.removeEventListener("visibilitychange", this.handleVisibility);
    }, this);
    var status = document.createElement("section"); status.id = "arenaEndless"; status.className = "arena-endless";
    status.innerHTML = '<p id="arenaDefense" aria-live="polite"></p><details id="arenaBossHelp"><summary>Encounter details</summary><p id="arenaBossIntel"></p></details><button type="button" id="arenaRetry">RETRY WAVE</button><button type="button" id="arenaTrain">TRAIN ON PREVIOUS WAVE</button>';
    document.querySelector(".operation-bar").appendChild(status);
    document.getElementById("arenaRetry").onclick = function () { ARENA.Endless.retry(this, false); }.bind(this);
    document.getElementById("arenaTrain").onclick = function () { ARENA.Endless.retry(this, true); }.bind(this);
    this.refreshUi();
    exposeDebugApi(this);
  };

  ArenaScene.prototype.update = function (time, deltaMs) {
    if (this.paused || document.hidden) { return; }
    deltaMs = Math.min(deltaMs, CONFIG.operations.maxFrameDeltaMs);
    if (ARENA.Waves.updateTransition(this.waveSystem, this.state, deltaMs)) { this.nextWave(); }
    this.state.elapsedSeconds += deltaMs / 1000;
    this.spawnAccumulatorMs += deltaMs;
    this.autosaveAccumulatorMs += deltaMs;

    if (this.combo > 0 && this.time.now > this.comboExpiresAt) {
      this.combo = 0;
    }

    this.spawnEnemies();
    ARENA.DestructibleBackground.update(this.destructibleBackgroundSystem, time);
    ARENA.WaterSurface.update(this.waterSurfaceSystem, time);
    ARENA.Endless.tick(this, deltaMs / 1000);
    if (this.state.wavePhase === "active") { ARENA.Enemies.update(this, this.enemies, deltaMs); }
    this.enemies = this.enemies.filter(function (enemy) {
      return enemy.active;
    });
    if (this.state.wavePhase === "active") {
      ARENA.HelperCursors.update(this.helperCursorSystem, this.stats, deltaMs);
    }

    if (this.autosaveAccumulatorMs >= CONFIG.autosaveMs) {
      this.autosaveAccumulatorMs = 0;
      ARENA.Save.save(this.state);
    }

    this.uiAccumulatorMs += deltaMs;
    if (this.uiAccumulatorMs >= CONFIG.operations.uiRefreshMs) {
      this.uiAccumulatorMs = 0;
      this.refreshUi();
    }
  };

  ArenaScene.prototype.spawnEnemies = function () {
    var definition = ARENA.Waves.getDefinition(this.state.wave);
    this.spawnAccumulatorMs = Math.min(this.spawnAccumulatorMs, definition.spawnIntervalMs);
    if (!this.spawningEnabled || this.paused ||
        !ARENA.Waves.canSpawn(this.waveSystem, this.state, this.enemies.filter(function (enemy) { return enemy.active; }).length) ||
        this.spawnAccumulatorMs < definition.spawnIntervalMs) { return; }
    this.spawnAccumulatorMs = 0;
    var role = ARENA.Waves.nextRole(this.state, this.waveSystem.spawned);
    var enemy = ARENA.Enemies.spawn(this, this.state.wave, role);
    if (role === "champion") { ARENA.Endless.setupBoss(this, enemy); }
    enemy.operationTarget = true;
    enemy.operationWave = this.state.wave;
    this.waveSystem.spawned += 1;
    this.enemies.push(enemy);
    if (role === "champion") { this.hud.log("CHAMPION RELEASED / BREAK ITS CONTAINMENT"); }
  };

  ArenaScene.prototype.handlePointerDown = function (pointer) {
    if (this.paused || this.state.wavePhase !== "active") { return; }
    if (pointer.downElement !== this.game.canvas) { return; }
    if (!pointer.wasTouch && pointer.button !== 0) { return; }
    var point = pointer.positionToCamera(this.cameras.main);
    this.soundSystem.unlock();
    ARENA.CursorAttack.attack(this, point.x, point.y, this.stats);
    this.refreshUi();
  };

  ArenaScene.prototype.registerKill = function (x, y, source) {
    if (this.time.now > this.comboExpiresAt) { this.combo = 0; }
    this.combo += 1;
    this.state.bestCombo = Math.max(this.state.bestCombo, this.combo);
    if (source === "manual") {
      this.state.pulseCharge = Math.min(CONFIG.operations.pulseMaxCharge, this.state.pulseCharge + CONFIG.operations.manualKillCharge);
    }
    this.comboExpiresAt = this.time.now + CONFIG.cursor.comboWindowMs;

    if (this.combo > 1) {
      ARENA.ImpactEffects.showComboPopup(this, this.combo, x || CONFIG.canvas.width / 2, y || 98);
      this.soundSystem.play("comboTick");
    }
  };

  ArenaScene.prototype.registerOperationKill = function (enemy) {
    var result = ARENA.Waves.registerKill(this.waveSystem, this.state, enemy);
    if (result.cleared) {
      this.enemies.forEach(function (target) { if (target.active) { target.destroy(); } });
      this.enemies = [];
      this.stats = ARENA.Upgrades.computeStats(this.state);
      this.clearRevealAt = this.time.now + CONFIG.operations.clearRevealDelayMs;
      this.soundSystem.play("waveClear");
      this.hud.log("ROOM SECURED / +" + result.reward + " ENERGY");
      this.refreshUi();
    }
    ARENA.Save.save(this.state);
  };

  ArenaScene.prototype.nextWave = function () {
    if (this.paused || document.hidden || !ARENA.Waves.next(this.waveSystem, this.state)) { return; }
    this.clearRevealAt = 0;
    this.combo = 0;
    this.comboExpiresAt = 0;
    this.spawnAccumulatorMs = ARENA.Waves.getDefinition(this.state.wave).spawnIntervalMs;
    this.soundSystem.unlock();
    // The Gigaboss arrival already announces that encounter.
    if (!ARENA.Waves.getDefinition(this.state.wave).champion) { this.soundSystem.play("wave"); }
    this.hud.log("WAVE " + this.state.wave + " RELEASED");
    ARENA.Save.save(this.state);
    this.refreshUi();
  };

  ArenaScene.prototype.togglePause = function () {
    if (this.state.wavePhase === "failed") { return; }
    this.paused = !this.paused;
    if (this.paused) {
      this.soundSystem.stop();
      this.pausedAt = this.time.now;
      this.tweens.pauseAll();
      this.time.paused = true;
    } else {
      // Phaser's clock now follows the game timestamp even while its timers are paused.
      var shift = this.time.now - this.pausedAt;
      if (this.clearRevealAt) { this.clearRevealAt += shift; }
      this.comboExpiresAt += shift;
      this.enemies.forEach(function (enemy) { enemy.nextTurnAt += shift; });
      this.helperCursorSystem.cursors.forEach(function (cursor) {
        cursor.cooldownUntil += shift;
        cursor.stateStartedAt += shift;
        cursor.nextActionAt += shift;
        cursor.clickFlashUntil += shift;
      });
      this.time.paused = false;
      this.tweens.resumeAll();
    }
    ARENA.Save.save(this.state);
    this.refreshUi();
  };

  ArenaScene.prototype.dischargePulse = function () {
    if (this.paused || this.state.wavePhase !== "active" ||
        this.state.pulseCharge < CONFIG.operations.pulseMaxCharge) { return; }
    var x = CONFIG.canvas.width / 2;
    var y = CONFIG.canvas.height / 2;
    var targets = ARENA.CursorAttack.findTargets(this.enemies, x, y, this.stats.pulseRadius);
    if (!targets.length) {
      this.hud.log("PULSE HELD / WAIT FOR TARGETS");
      return;
    }
    this.state.pulseCharge = 0;
    this.soundSystem.unlock();
    ARENA.CursorAttack.attack(this, x, y, this.stats, {
      source: "pulse", radius: this.stats.pulseRadius,
      damage: this.stats.clickDamage * this.stats.pulseDamageMultiplier
    });
    var ring = this.add.circle(x, y, this.stats.pulseRadius, CONFIG.operations.pulseColor, CONFIG.operations.pulseAlpha);
    ring.setStrokeStyle(CONFIG.operations.pulseLineWidth, CONFIG.operations.pulseColor);
    ring.setDepth(CONFIG.operations.pulsePreviewDepth);
    ring.setScale(CONFIG.operations.pulseStartScale);
    this.tweens.add({ targets: ring, alpha: 0, scale: 1, duration: CONFIG.operations.pulseDurationMs,
      onComplete: function () { ring.destroy(); } });
    this.soundSystem.play("pulse");
    this.hud.log("PULSE DISCHARGED / " + targets.length + (targets.length === 1 ? " TARGET HIT" : " TARGETS HIT"));
    ARENA.Save.save(this.state);
    this.refreshUi();
  };

  ArenaScene.prototype.buyUpgrade = function (id) {
    this.soundSystem.unlock();

    if (!ARENA.Upgrades.buy(this.state, id)) {
      this.hud.log("INSUFFICIENT ENERGY");
      return;
    }

    this.stats = ARENA.Upgrades.computeStats(this.state);
    this.soundSystem.play("upgrade");
    this.hud.log(ARENA.Upgrades.get(id).name + " ONLINE");
    ARENA.Save.save(this.state);
    this.refreshUi();
  };

  ArenaScene.prototype.toggleMute = function () {
    this.state.muted = !this.state.muted;
    this.soundSystem.setMuted(this.state.muted);
    this.soundSystem.unlock();
    ARENA.Save.save(this.state);
    this.refreshUi();
  };

  ArenaScene.prototype.setClickSkin = function (id) {
    if (!ARENA.ClickEffectSkins.setActive(this.state, id)) {
      this.hud.log("CLICK SKIN LOCKED");
      this.refreshUi();
      return;
    }

    this.hud.log("CLICK SKIN: " + ARENA.ClickEffectSkins.get(id).name);
    ARENA.Save.save(this.state);
    this.refreshUi();
  };

  ArenaScene.prototype.setEnemySkin = function (id) {
    if (!ARENA.EnemySkins.setActive(this.state, id)) {
      this.hud.log("ENEMY SKIN LOCKED");
      this.refreshUi();
      return;
    }

    this.hud.log("ENEMY SKIN: " + ARENA.EnemySkins.get(id).name);
    ARENA.Save.save(this.state);
    this.refreshUi();
  };

  ArenaScene.prototype.setBackgroundSkin = function (id) {
    if (!ARENA.BackgroundSkins.setActive(this.state, id)) {
      this.hud.log("BACKGROUND LOCKED");
      this.refreshUi();
      return;
    }

    this.rebuildBackgroundSystems();
    this.pushEnemiesOutOfObstacles();
    this.hud.log("BACKGROUND: " + ARENA.BackgroundSkins.get(id).name);
    ARENA.Save.save(this.state);
    this.refreshUi();
  };

  ArenaScene.prototype.rebuildBackgroundSystems = function () {
    ARENA.DestructibleBackground.clear(this.destructibleBackgroundSystem);
    ARENA.WaterSurface.clear(this.waterSurfaceSystem);
    ARENA.BackgroundEffects.clear(this.backgroundEffectSystem);
    if (this.obstacleSystem) {
      ARENA.Obstacles.clear(this.obstacleSystem);
    }
    if (this.townNavigationSystem) {
      ARENA.TownNavigation.clear(this.townNavigationSystem);
    }
    this.destructibleBackgroundSystem = ARENA.DestructibleBackground.create(this);
    this.waterSurfaceSystem = ARENA.WaterSurface.create(this, ARENA.BackgroundSkins.get(this.state.activeBackgroundSkin));
    this.obstacleSystem = ARENA.Obstacles.create(this, ARENA.BackgroundSkins.get(this.state.activeBackgroundSkin));
    this.townNavigationSystem = ARENA.TownNavigation.create(this, ARENA.BackgroundSkins.get(this.state.activeBackgroundSkin));
    this.backgroundEffectSystem = ARENA.BackgroundEffects.create(this);
  };

  ArenaScene.prototype.pushEnemiesOutOfObstacles = function () {
    if (!this.obstacleSystem || !this.obstacleSystem.enabled) {
      return;
    }
    this.enemies.forEach(function (enemy) {
      var safe = ARENA.Obstacles.getSafeSpawnPoint(this.obstacleSystem, enemy.x, enemy.y, enemy.radius || enemy.baseRadius || 0);
      if (safe.adjusted) {
        enemy.x = safe.x;
        enemy.y = safe.y;
        if (enemy.shadow && enemy.shadow.active) {
          enemy.shadow.x = enemy.x + 2;
          enemy.shadow.y = enemy.y + 4;
        }
      }
    }, this);
  };

  ArenaScene.prototype.resetPrototype = function () {
    if (this.paused) { this.togglePause(); }
    this.clearRevealAt = 0;
    this.defeatRevealAt = 0;
    this.coreHitUntil = 0;
    this.soundSystem.destroy();
    this.state = ARENA.Save.reset();
    this.waveSystem = ARENA.Waves.create(this.state);
    this.spawnAccumulatorMs = 0;
    this.autosaveAccumulatorMs = 0;
    this.stats = ARENA.Upgrades.computeStats(this.state);
    this.soundSystem = ARENA.createSoundSystem(this.state);
    this.combo = 0;
    this.comboExpiresAt = 0;
    this.enemies.forEach(function (enemy) {
      if (enemy.shadow && enemy.shadow.active) {
        enemy.shadow.destroy();
      }
      enemy.destroy();
    });
    this.helperCursorSystem.cursors.forEach(function (cursor) {
      cursor.graphic.destroy();
    });
    this.enemies = [];
    this.effectCounts = {};
    this.enemySerial = 0;
    this.lastGroundBreakEffect = null;
    this.lastPixelShatterEffect = null;
    ARENA.DestructibleBackground.clear(this.destructibleBackgroundSystem);
    ARENA.WaterSurface.clear(this.waterSurfaceSystem);
    ARENA.BackgroundEffects.clear(this.backgroundEffectSystem);
    if (this.obstacleSystem) {
      ARENA.Obstacles.clear(this.obstacleSystem);
    }
    if (this.townNavigationSystem) {
      ARENA.TownNavigation.clear(this.townNavigationSystem);
    }
    this.destructibleBackgroundSystem = ARENA.DestructibleBackground.create(this);
    this.waterSurfaceSystem = ARENA.WaterSurface.create(this, ARENA.BackgroundSkins.get(this.state.activeBackgroundSkin));
    this.obstacleSystem = ARENA.Obstacles.create(this, ARENA.BackgroundSkins.get(this.state.activeBackgroundSkin));
    this.townNavigationSystem = ARENA.TownNavigation.create(this, ARENA.BackgroundSkins.get(this.state.activeBackgroundSkin));
    this.backgroundEffectSystem = ARENA.BackgroundEffects.create(this);
    this.helperCursorSystem = ARENA.HelperCursors.create(this);
    this.hud.log("PROTOTYPE SAVE RESET");
    this.refreshUi();
  };

  ArenaScene.prototype.refreshUi = function () {
    this.pulsePreview.setVisible(!this.paused && this.state.wavePhase === "active" && this.state.pulseCharge >= CONFIG.operations.pulseMaxCharge);
    this.hud.update(this.state, this.combo, this);
    this.panel.update(this.state);
    if (!document.getElementById("arenaEndless")) { return; }
    var e = ARENA.Endless.ensure(this.state), c = CONFIG.endless;
    var boss = this.enemies.find(function (target) { return target.active && target.gigaboss; });
    var failed = this.state.wavePhase === "failed";
    this.drawDefense(boss);
    var resultReady = failed && this.time.now >= this.defeatRevealAt;
    document.getElementById("arenaEndless").hidden = this.state.wave < c.pressureFirstWave && !e.offers.length && !e.modules.length && !failed;
    document.getElementById("arenaDefense").textContent = failed ? (resultReady ? ARENA.Endless.failureReason(this.state) + ". Purchases and completed waves retained. No retry bonus." : "") : "";
    document.getElementById("arenaBossIntel").textContent = "Wave " + (Math.ceil(this.state.wave / c.cycleLength) * c.cycleLength) + ": " + ARENA.Endless.traits(this.state.wave).map(function (t) { return t.name + " / " + t.hint; }).join(" / ");
    document.getElementById("arenaBossHelp").hidden = failed;
    document.getElementById("arenaRetry").hidden = !resultReady;
    document.getElementById("arenaTrain").hidden = !resultReady || this.state.wave % c.cycleLength !== 0;
    var signature = e.offers.join(",") + ":" + e.round + ":" + this.state.wavePhase;
    if (signature !== this.draftSignature) {
      this.draftSignature = signature;
      var draft = document.getElementById("arenaDraft"); draft.replaceChildren();
      var label = document.createElement("p");
      label.textContent = e.modules.length ? "Build: " + e.modules.map(function (id) { return c.modules.find(function (m) { return m.id === id; }).name; }).join(" + ") : "";
      draft.appendChild(label);
      if (e.offers.length && this.state.wavePhase === "cleared") {
        var note = document.createElement("p"); note.textContent = "Optional: choose slot " + (e.round % c.slots + 1) + (e.modules.length >= c.slots ? " replacement. Only three modules stay active." : ". Three active slots; future choices replace a slot."); draft.appendChild(note);
        if (e.modules.length >= c.slots) {
          var keep = document.createElement("button"); keep.type = "button"; keep.textContent = "KEEP CURRENT BUILD";
          keep.onclick = function () { e.offers = []; e.round++; ARENA.Save.save(this.state); this.refreshUi(); }.bind(this); draft.appendChild(keep);
        }
        e.offers.forEach(function (id) {
          var def = c.modules.find(function (m) { return m.id === id; });
          var button = document.createElement("button"); button.type = "button"; button.textContent = def.name + " / " + def.text;
          button.onclick = function () { if (ARENA.Endless.choose(this.state, id)) { this.soundSystem.play("upgrade"); this.stats = ARENA.Upgrades.computeStats(this.state); ARENA.Save.save(this.state); this.refreshUi(); } }.bind(this);
          draft.appendChild(button);
        }, this);
      }
    }
  };

  ArenaScene.prototype.drawDefense = function (boss) {
    var e = this.state.endless, c = CONFIG.endless, g = this.bossTelegraph, ui = ARENA.UI_CONFIG.defense;
    var failed = this.state.wavePhase === "failed", bossWave = this.state.wave % c.cycleLength === 0;
    var visible = this.state.wavePhase !== "cleared" && (bossWave || this.state.wave >= c.pressureFirstWave);
    g.clear(); this.defenseLabel.setVisible(visible); this.coreLabel.setVisible(visible && bossWave);
    if (!visible) { return; }
    var textScale = Math.max(1, Math.min(2, CONFIG.canvas.width / Math.max(1, this.game.canvas.getBoundingClientRect().width)));
    this.defenseLabel.setFontSize(18 * textScale).setWordWrapWidth(CONFIG.canvas.width - 100);
    this.coreLabel.setFontSize(16 * textScale);
    var danger = bossWave ? e.core / CONFIG.core.maxHealth : e.pressure / 100;
    var color = failed || (bossWave ? danger < 0.4 : danger >= 0.65) ? 0xd82929 : 0x16899a;
    this.defenseLabel.setText(bossWave ? "GIGABOSS" + (boss ? "  " + Math.ceil(boss.health) + " HP" : "") : "OVERRUN " + Math.ceil(e.pressure) + "%");
    var meterY = this.defenseLabel.y + this.defenseLabel.height + 6, meterX = (CONFIG.canvas.width - ui.meterWidth) / 2;
    if (!bossWave) {
      g.fillStyle(0x111c25, 0.95); g.fillRect(meterX, meterY, ui.meterWidth, 12);
      g.fillStyle(color, 1); g.fillRect(meterX, meterY, ui.meterWidth * danger, 12);
      // Fixed threshold ticks remain legible without color or animation.
      g.lineStyle(2, 0xffffff, 0.8);
      [0.65, 0.85].forEach(function (n) { g.lineBetween(meterX + ui.meterWidth * n, meterY, meterX + ui.meterWidth * n, meterY + 12); });
      if (danger > 0) {
        g.lineStyle(2 + danger * 5, color, 0.25 + danger * 0.65);
        g.strokeRect(9, 9, CONFIG.canvas.width - 18, CONFIG.canvas.height - 18);
        // Corner chevrons close inward as pressure rises; targets stay unobscured.
        var inset = 18 + danger * 30;
        [[inset,inset,1,1],[CONFIG.canvas.width-inset,inset,-1,1],[inset,CONFIG.canvas.height-inset,1,-1],[CONFIG.canvas.width-inset,CONFIG.canvas.height-inset,-1,-1]].forEach(function (p) {
          g.lineBetween(p[0], p[1]+p[3]*26, p[0], p[1]); g.lineBetween(p[0], p[1], p[0]+p[2]*26, p[1]);
        });
      }
      return;
    }
    var charging = !failed && e.attack >= c.bossAttackSeconds - c.bossWindupSeconds;
    var charge = charging ? Math.min(1, (e.attack - c.bossAttackSeconds + c.bossWindupSeconds) / c.bossWindupSeconds) : 0;
    var struck = this.time.now < this.coreHitUntil, broken = this.time.now < this.bossBreakUntil;
    var x = this.core.x, y = this.core.y, r = CONFIG.core.radius * Math.min(1.6, textScale);
    this.coreLabel.setY(y + r + 12);
    g.fillStyle(failed ? 0x292e36 : struck ? 0xd82929 : 0x16899a, failed ? 0.9 : 0.25);
    g.fillCircle(x, y, r);
    g.lineStyle(struck ? 6 : 3, struck ? 0xd82929 : color, 1);
    if (!failed) { g.strokeCircle(x, y, r); }
    // A six-sided housing progressively loses panels as integrity falls.
    for (var i = 0; i < 6; i++) {
      var a = i * Math.PI / 3, b = a + Math.PI / 3 - 0.09, damaged = i >= Math.ceil(danger * 6);
      var offset = failed ? 12 : damaged ? 5 : 0;
      g.lineStyle(damaged ? 2 : 5, damaged ? 0x795b59 : color, 1);
      g.lineBetween(x + Math.cos(a) * (r+offset), y + Math.sin(a) * (r+offset), x + Math.cos(b) * (r+offset), y + Math.sin(b) * (r+offset));
    }
    if (danger < 0.75) { g.lineStyle(3, 0x3a242b, 1); g.lineBetween(x-r*.6,y-r*.5,x+4,y+3); g.lineBetween(x+4,y+3,x-8,y+r*.7); }
    if (danger < 0.4) { g.lineBetween(x+4,y+3,x+r*.7,y-r*.4); }
    if (failed) { g.lineStyle(5,0xc46b61,1); g.lineBetween(x-13,y-13,x+13,y+13); g.lineBetween(x+13,y-13,x-13,y+13); }
    this.coreLabel.setText(failed ? "CORE DESTROYED / 0%" : "CORE " + Math.ceil(e.core) + "%");
    if (!boss) { return; }
    var bx = boss.x, by = boss.y, radius = ui.cueRadius;
    var traitIds = ARENA.Endless.traits(this.state.wave).map(function (t) { return t.id; });
    if (charging && traitIds.indexOf("swarm") >= 0) {
      g.lineStyle(3, 0x7b48a5, 0.8);
      [-1, 1].forEach(function (side) { g.strokeTriangle(bx+side*70,by-12,bx+side*88,by+12,bx+side*52,by+12); });
    }
    if (charging || struck) {
      // A narrow lane, advancing chevron and contracting target show source and destination.
      g.lineStyle(struck ? 9 : 2, 0xd82929, struck ? 0.95 : 0.45 + charge * 0.4);
      g.lineBetween(bx, by + radius, x, y - r);
      if (traitIds.indexOf("siege") >= 0) {
        g.lineBetween(bx-9,by+radius,x-9,y-r); g.lineBetween(bx+9,by+radius,x+9,y-r);
      }
      g.strokeCircle(x, y, r + (1-charge)*25);
      var arrowY = by + radius + (y-r-by-radius) * charge;
      g.lineStyle(4,0xd82929,1); g.lineBetween(x-9,arrowY-9,x,arrowY); g.lineBetween(x+9,arrowY-9,x,arrowY);
      g.beginPath(); g.arc(bx,by,radius+7,-Math.PI/2,-Math.PI/2+charge*Math.PI*2); g.strokePath();
      var stagger = Math.min(1,e.stagger / (boss.maxHealth*c.interruptFraction));
      if (stagger > 0) {
        g.lineStyle(5,0x157e89,1);
        for (var j=0;j<Math.ceil(stagger*6);j++) { var angle=j*Math.PI/3; g.lineBetween(bx+Math.cos(angle)*radius,by+Math.sin(angle)*radius,bx+Math.cos(angle)*(radius+10),by+Math.sin(angle)*(radius+10)); }
      }
    }
    var armor = ARENA.Endless.traits(this.state.wave).some(function(t){return t.id === "armor";});
    if (armor) {
      var open = charging || broken, plateRadius = radius + (open ? 15 : 0);
      g.lineStyle(open ? 2 : 6, this.time.now < boss.armorHitUntil ? 0xffffff : 0x566878, 1);
      for (var k=0;k<6;k++) { var angle1=k*Math.PI/3+.12, angle2=(k+1)*Math.PI/3-.12;
        g.beginPath();g.arc(bx,by,plateRadius,angle1,angle2);g.strokePath();
      }
    }
    if (broken) {
      var expansion = 1 - (this.bossBreakUntil - this.time.now) / ui.breakMs;
      g.lineStyle(4,0x16899a,1-expansion*.6);
      for (var n=0;n<4;n++) { g.beginPath(); g.arc(bx,by,radius+expansion*22,n*Math.PI/2+.18,n*Math.PI/2+1.15);g.strokePath(); }
      this.defenseLabel.setText("BREAK");
    }
    if (this.time.now < this.summonUntil) {
      g.lineStyle(3,0x7b48a5,0.75); g.strokeCircle(bx,by,radius+12);
      (this.summonTargets || []).forEach(function (target) { g.lineBetween(bx,by,target.x,target.y); g.strokeCircle(target.x,target.y,24); });
    }
  };

  function drawRoom(scene) {
    var graphics = scene.add.graphics();
    graphics.setDepth(-20);
    graphics.fillStyle(CONFIG.canvas.background, 1);
    graphics.fillRect(0, 0, CONFIG.canvas.width, CONFIG.canvas.height);
    graphics.lineStyle(1, 0xd9e2e6, 0.9);

    for (var x = 0; x <= CONFIG.canvas.width; x += 48) {
      graphics.lineBetween(x, 0, x, CONFIG.canvas.height);
    }

    for (var y = 0; y <= CONFIG.canvas.height; y += 48) {
      graphics.lineBetween(0, y, CONFIG.canvas.width, y);
    }

    graphics.lineStyle(2, 0xbac8ce, 1);
    graphics.strokeRect(18, 18, CONFIG.canvas.width - 36, CONFIG.canvas.height - 36);
    graphics.lineStyle(1, 0x9caeb6, 0.5);
    graphics.strokeCircle(CONFIG.canvas.width / 2, CONFIG.canvas.height / 2, 64);
  }

  function getBackgroundAssetSnapshot(scene) {
    var missing = [];
    var loaded = {};
    BACKGROUND_ASSETS.forEach(function (asset) {
      var exists = Boolean(scene.textures && scene.textures.exists && scene.textures.exists(asset.key));
      loaded[asset.key] = exists;
      if (!exists) {
        missing.push(asset.key);
      }
    });
    return {
      sandLoaded: BACKGROUND_ASSETS.filter(function (asset) {
        return asset.group === "sand";
      }).every(function (asset) {
        return loaded[asset.key];
      }),
      waterLoaded: BACKGROUND_ASSETS.filter(function (asset) {
        return asset.group === "water";
      }).every(function (asset) {
        return loaded[asset.key];
      }),
      missing: missing,
      keys: loaded,
      paths: BACKGROUND_ASSETS.reduce(function (paths, asset) {
        paths[asset.key] = asset.path;
        return paths;
      }, {})
    };
  }

  function exposeDebugApi(scene) {
    window.__containmentArena = {
      scene: scene,
      grantEnergy: function (amount) {
        scene.state.energy += amount;
        scene.refreshUi();
      },
      setSpawning: function (enabled) {
        scene.spawningEnabled = Boolean(enabled);
      },
      clearEnemies: function () {
        scene.enemies.forEach(function (enemy) {
          if (enemy.shadow && enemy.shadow.active) {
            enemy.shadow.destroy();
          }
          enemy.destroy();
        });
        scene.enemies = [];
      },
      spawnEnemyAt: function (x, y, health) {
        var enemy = ARENA.Enemies.create(scene, x, y, scene.state.wave, health || CONFIG.enemy.baseHealth);
        scene.enemies.push(enemy);
        return scene.enemies.length - 1;
      },
      clickAt: function (x, y) {
        var result = ARENA.CursorAttack.attack(scene, x, y, scene.stats);
        scene.refreshUi();
        return {
          hit: result.hit,
          killed: result.killed.length
        };
      },
      setClickSkin: function (id) {
        scene.setClickSkin(id);
      },
      setEnemySkin: function (id) {
        scene.setEnemySkin(id);
      },
      setBackgroundSkin: function (id) {
        scene.setBackgroundSkin(id);
      },
      getSnapshot: function () {
        scene.backgroundAssets = getBackgroundAssetSnapshot(scene);
        var destructibleSnapshot = ARENA.DestructibleBackground.getSnapshot(scene.destructibleBackgroundSystem);
        var waterSurfaceSnapshot = ARENA.WaterSurface.getSnapshot(scene.waterSurfaceSystem);
        var obstacleSnapshot = ARENA.Obstacles.getSnapshot(scene.obstacleSystem, scene.enemies);
        var townNavigationSnapshot = ARENA.TownNavigation.getSnapshot(scene.townNavigationSystem, scene.enemies);
        window.__arenaDebug = {
          activeBackgroundSkin: scene.state.activeBackgroundSkin,
          backgroundAssets: scene.backgroundAssets,
          backgroundMaterial: destructibleSnapshot.backgroundMaterial,
          sandTexture: destructibleSnapshot.sandTexture,
          waterAnimation: destructibleSnapshot.waterAnimation,
          waterSurface: waterSurfaceSnapshot,
          obstacles: obstacleSnapshot.obstacles,
          enemiesInsideObstacles: obstacleSnapshot.enemiesInsideObstacles,
          townMap: obstacleSnapshot.townMap,
          townNavigation: townNavigationSnapshot,
          lastTownSurfaceHit: scene.lastTownSurfaceHit || null,
          lastBackgroundResponse: destructibleSnapshot.lastBackgroundResponse,
          lastGroundBreakBrush: destructibleSnapshot.lastGroundBreakBrush,
          lastPixelShatterBrush: destructibleSnapshot.lastPixelShatterBrush,
          lastGroundBreakEffect: scene.lastGroundBreakEffect || null,
          lastPixelShatterEffect: scene.lastPixelShatterEffect || null,
          backgroundDamageCount: destructibleSnapshot.damageCount,
          backgroundRepairCount: destructibleSnapshot.repairCount,
          activeDamageMarks: destructibleSnapshot.activeDamageMarks,
          activeTemporaryChunks: destructibleSnapshot.activeTemporaryChunks
        };
        return {
          energy: scene.state.energy,
          wave: scene.state.wave,
          wavePhase: scene.state.wavePhase,
          waveKills: scene.state.waveKills,
          pulseCharge: scene.state.pulseCharge,
          paused: scene.paused,
          totalDefeated: scene.state.totalDefeated,
          enemyCount: scene.enemies.length,
          helperCursorCount: scene.helperCursorSystem.cursors.length,
          helperCursorSnapshots: scene.helperCursorSystem.cursors.map(function (cursor) {
            return {
              state: cursor.state,
              x: cursor.x,
              y: cursor.y,
              targetActive: Boolean(cursor.target && cursor.target.active),
              targetDistance: cursor.target && cursor.target.active ? Phaser.Math.Distance.Between(cursor.x, cursor.y, cursor.target.x, cursor.target.y) : null,
              cooldownRemainingMs: Math.max(0, cursor.cooldownUntil - scene.time.now)
            };
          }),
          enemySnapshots: scene.enemies.filter(function (enemy) {
            return enemy.active;
          }).map(function (enemy) {
            return {
              id: enemy.debugId,
              x: enemy.x,
              y: enemy.y,
              rotation: enemy.rotation,
              lastMoveAngle: enemy.lastMoveAngle,
              movingAmount: enemy.movingAmount,
              obstacleStuck: Boolean(enemy.obstacleStuck),
              townStuck: Boolean(enemy.townStuck),
              townPathLength: enemy.townPath ? enemy.townPath.length : 0,
              skin: enemy.enemySkin.id,
              role: enemy.roleId,
              health: enemy.health,
              forwardAngleOffset: enemy.enemySkin.animation.forwardAngleOffset,
              segmentCount: enemy.enemySkin.ant ? enemy.enemySkin.ant.segmentCount : null
            };
          }),
          combo: scene.combo,
          effectCounts: Object.assign({}, scene.effectCounts),
          lastGroundBreakEffect: scene.lastGroundBreakEffect || null,
          lastPixelShatterEffect: scene.lastPixelShatterEffect || null,
          destructibleBackground: destructibleSnapshot,
          waterSurface: waterSurfaceSnapshot,
          obstacles: obstacleSnapshot,
          enemiesInsideObstacles: obstacleSnapshot.enemiesInsideObstacles,
          townMap: obstacleSnapshot.townMap,
          townNavigation: townNavigationSnapshot,
          lastTownSurfaceHit: scene.lastTownSurfaceHit || null,
          backgroundDecalCount: scene.backgroundEffectSystem.decals.length,
          activeClickSkin: scene.state.activeClickSkin,
          unlockedClickSkins: Object.assign({}, scene.state.unlockedClickSkins),
          activeEnemySkin: scene.state.activeEnemySkin,
          unlockedEnemySkins: Object.assign({}, scene.state.unlockedEnemySkins),
          activeBackgroundSkin: scene.state.activeBackgroundSkin,
          unlockedBackgroundSkins: Object.assign({}, scene.state.unlockedBackgroundSkins),
          upgrades: Object.assign({}, scene.state.upgrades),
          stats: ARENA.Upgrades.computeStats(scene.state),
          muted: scene.state.muted,
          backgroundAssets: scene.backgroundAssets
        };
      }
    };
  }

  ARENA.ArenaScene = ArenaScene;
})();
