(function () {
  "use strict";

  window.ARENA = window.ARENA || {};

  var CONFIG = ARENA.BALANCE_CONFIG;

  function ArenaScene() {
    Phaser.Scene.call(this, { key: "ArenaScene" });
  }

  ArenaScene.prototype = Object.create(Phaser.Scene.prototype);
  ArenaScene.prototype.constructor = ArenaScene;

  ArenaScene.prototype.create = function () {
    this.state = ARENA.Save.load();
    this.stats = ARENA.Upgrades.computeStats(this.state);
    this.soundSystem = ARENA.createSoundSystem(this.state);
    this.enemies = [];
    this.spawnAccumulatorMs = 0;
    this.autosaveAccumulatorMs = 0;
    this.lastWave = this.state.wave;
    this.combo = 0;
    this.comboExpiresAt = 0;
    this.core = { x: CONFIG.canvas.width / 2, y: CONFIG.canvas.height / 2 };
    this.helperCursorSystem = ARENA.HelperCursors.create(this);

    drawRoom(this);
    this.input.on("pointerdown", this.handlePointerDown, this);

    this.hud = ARENA.createArenaHud({
      onToggleMute: this.toggleMute.bind(this),
      onReset: this.resetPrototype.bind(this)
    });
    this.panel = ARENA.createUpgradePanel({
      onBuy: this.buyUpgrade.bind(this)
    });

    this.refreshUi();
    exposeDebugApi(this);
  };

  ArenaScene.prototype.update = function (time, deltaMs) {
    this.state.elapsedSeconds += deltaMs / 1000;
    this.state.wave = 1 + Math.floor(this.state.elapsedSeconds / CONFIG.enemy.waveEverySeconds);
    this.spawnAccumulatorMs += deltaMs;
    this.autosaveAccumulatorMs += deltaMs;

    if (this.state.wave !== this.lastWave) {
      this.lastWave = this.state.wave;
      this.soundSystem.play("wave");
      this.hud.log("MORE ANOMALIES ENTERED THE ROOM");
    }

    if (this.combo > 0 && this.time.now > this.comboExpiresAt) {
      this.combo = 0;
    }

    this.spawnEnemies();
    ARENA.Enemies.update(this, this.enemies, deltaMs);
    this.enemies = this.enemies.filter(function (enemy) {
      return enemy.active;
    });
    ARENA.HelperCursors.update(this.helperCursorSystem, this.stats, deltaMs);

    if (this.autosaveAccumulatorMs >= CONFIG.autosaveMs) {
      this.autosaveAccumulatorMs = 0;
      ARENA.Save.save(this.state);
    }

    this.refreshUi();
  };

  ArenaScene.prototype.spawnEnemies = function () {
    var spawnInterval = Math.max(
      CONFIG.enemy.minimumSpawnIntervalMs,
      CONFIG.enemy.spawnIntervalMs * Math.pow(0.94, this.state.wave - 1)
    );

    while (this.spawnAccumulatorMs >= spawnInterval) {
      this.spawnAccumulatorMs -= spawnInterval;
      for (var index = 0; index < CONFIG.enemy.spawnBurst; index += 1) {
        this.enemies.push(ARENA.Enemies.spawn(this, this.state.wave));
      }
    }
  };

  ArenaScene.prototype.handlePointerDown = function (pointer) {
    var point = pointer.positionToCamera(this.cameras.main);
    this.soundSystem.unlock();
    ARENA.CursorAttack.attack(this, point.x, point.y, this.stats);
    this.refreshUi();
  };

  ArenaScene.prototype.registerKill = function () {
    this.combo += 1;
    this.comboExpiresAt = this.time.now + CONFIG.cursor.comboWindowMs;

    if (this.combo > 1) {
      ARENA.ImpactEffects.showHitText(this, this.combo + "x", CONFIG.canvas.width / 2, 72, 0xd82626);
    }
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

  ArenaScene.prototype.resetPrototype = function () {
    this.state = ARENA.Save.reset();
    this.stats = ARENA.Upgrades.computeStats(this.state);
    this.soundSystem = ARENA.createSoundSystem(this.state);
    this.combo = 0;
    this.comboExpiresAt = 0;
    this.enemies.forEach(function (enemy) {
      enemy.destroy();
    });
    this.helperCursorSystem.cursors.forEach(function (cursor) {
      cursor.graphic.destroy();
    });
    this.enemies = [];
    this.helperCursorSystem = ARENA.HelperCursors.create(this);
    this.hud.log("PROTOTYPE SAVE RESET");
    this.refreshUi();
  };

  ArenaScene.prototype.refreshUi = function () {
    this.hud.update(this.state, this.combo);
    this.panel.update(this.state);
  };

  function drawRoom(scene) {
    var graphics = scene.add.graphics();
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

  function exposeDebugApi(scene) {
    window.__containmentArena = {
      scene: scene,
      grantEnergy: function (amount) {
        scene.state.energy += amount;
        scene.refreshUi();
      },
      spawnEnemyAt: function (x, y, health) {
        var enemy = scene.add.circle(x, y, CONFIG.enemy.radius, 0xe84848, 0.92);
        enemy.maxHealth = health || CONFIG.enemy.baseHealth;
        enemy.health = enemy.maxHealth;
        enemy.speed = CONFIG.enemy.baseSpeed;
        enemy.reward = CONFIG.enemy.baseReward;
        enemy.hitFlashUntil = 0;
        enemy.spawnSeed = Math.random() * 1000;
        enemy.driftAngle = 0;
        enemy.setStrokeStyle(1, 0xff9a9a, 0.55);
        scene.enemies.push(enemy);
        return scene.enemies.length - 1;
      },
      clickAt: function (x, y) {
        return ARENA.CursorAttack.attack(scene, x, y, scene.stats);
      },
      getSnapshot: function () {
        return {
          energy: scene.state.energy,
          wave: scene.state.wave,
          totalDefeated: scene.state.totalDefeated,
          enemyCount: scene.enemies.length,
          helperCursorCount: scene.helperCursorSystem.cursors.length,
          combo: scene.combo,
          upgrades: Object.assign({}, scene.state.upgrades),
          stats: ARENA.Upgrades.computeStats(scene.state),
          muted: scene.state.muted
        };
      }
    };
  }

  ARENA.ArenaScene = ArenaScene;
})();
