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
    this.projectiles = [];
    this.attackState = ARENA.Attacks.createState();
    this.spawnAccumulatorMs = 0;
    this.autosaveAccumulatorMs = 0;
    this.lastWave = this.state.wave;
    this.coreHealth = CONFIG.core.maxHealth;
    this.core = { x: CONFIG.canvas.width / 2, y: CONFIG.canvas.height / 2, radius: CONFIG.core.radius };

    drawRoom(this);
    this.coreShape = this.add.circle(this.core.x, this.core.y, CONFIG.core.radius, 0x37d5ff, 0.95);
    this.coreShape.setStrokeStyle(3, 0xdff8ff, 0.75);
    this.orbiterGraphics = this.add.graphics();

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
      this.hud.log("WAVE " + this.state.wave + " ESCALATION");
    }

    this.spawnEnemies();
    ARENA.Enemies.update(this, this.enemies, this.core, deltaMs, this.damageCore.bind(this));
    this.enemies = this.enemies.filter(function (enemy) {
      return enemy.active;
    });

    ARENA.Attacks.update(this, this.attackState, this.stats, this.enemies, this.projectiles, deltaMs, {
      damageEnemy: this.damageEnemy.bind(this),
      onAttack: this.onAttack.bind(this)
    });
    ARENA.Attacks.updateProjectiles(this, this.stats, this.enemies, this.projectiles, deltaMs, {
      damageEnemy: this.damageEnemy.bind(this)
    });

    if (this.autosaveAccumulatorMs >= CONFIG.autosaveMs) {
      this.autosaveAccumulatorMs = 0;
      ARENA.Save.save(this.state);
    }

    this.refreshUi();
  };

  ArenaScene.prototype.spawnEnemies = function () {
    var spawnInterval = Math.max(
      CONFIG.enemy.minimumSpawnIntervalMs,
      CONFIG.enemy.spawnIntervalMs * Math.pow(0.92, this.state.wave - 1)
    );

    while (this.spawnAccumulatorMs >= spawnInterval) {
      this.spawnAccumulatorMs -= spawnInterval;
      for (var index = 0; index < CONFIG.enemy.spawnBurst; index += 1) {
        this.enemies.push(ARENA.Enemies.spawn(this, this.state.wave));
      }
    }
  };

  ArenaScene.prototype.onAttack = function () {
    this.soundSystem.play("attack");
  };

  ArenaScene.prototype.damageEnemy = function (enemy, amount, sourceX, sourceY) {
    if (!enemy || !enemy.active) {
      return;
    }

    if (sourceX !== undefined && sourceY !== undefined) {
      ARENA.Attacks.drawHitLine(this, sourceX, sourceY, enemy.x, enemy.y, 0x37d5ff);
    }

    if (!ARENA.Enemies.damage(this, enemy, amount)) {
      this.soundSystem.play("hit");
      return;
    }

    var reward = enemy.reward * this.stats.rewardMultiplier;
    var x = enemy.x;
    var y = enemy.y;
    enemy.destroy();
    this.state.energy += reward;
    this.state.totalDefeated += 1;
    this.soundSystem.play("destroy");
    this.showFloatingText("+" + ARENA.formatNumber(reward), x, y, 0x37d5ff);
    this.showPop(x, y);
  };

  ArenaScene.prototype.damageCore = function (amount) {
    this.coreHealth -= amount;
    this.soundSystem.play("coreDamage");
    this.coreShape.setFillStyle(0xffffff, 1);
    this.time.delayedCall(CONFIG.core.damagedFlashMs, function () {
      this.coreShape.setFillStyle(0x37d5ff, 0.95);
    }, [], this);

    if (this.coreHealth <= 0) {
      this.coreHealth = Math.ceil(CONFIG.core.maxHealth * CONFIG.core.rebootHealthRatio);
      this.enemies.forEach(function (enemy) {
        enemy.destroy();
      });
      this.enemies = [];
      this.hud.log("CORE REBOOTED // SWARM PURGED");
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
    this.coreHealth = CONFIG.core.maxHealth;
    this.enemies.forEach(function (enemy) {
      enemy.destroy();
    });
    this.projectiles.forEach(function (projectile) {
      projectile.destroy();
    });
    this.enemies = [];
    this.projectiles = [];
    this.hud.log("PROTOTYPE SAVE RESET");
    this.refreshUi();
  };

  ArenaScene.prototype.refreshUi = function () {
    this.hud.update(this.state, this.coreHealth, CONFIG.core.maxHealth);
    this.panel.update(this.state);
  };

  ArenaScene.prototype.showFloatingText = function (text, x, y, color) {
    var label = this.add.text(x, y - 10, text, {
      fontFamily: "Consolas, monospace",
      fontSize: "13px",
      color: "#" + color.toString(16).padStart(6, "0")
    }).setOrigin(0.5);

    this.tweens.add({
      targets: label,
      y: y - 38,
      alpha: 0,
      duration: CONFIG.feedback.floatingTextMs,
      onComplete: function () {
        label.destroy();
      }
    });
  };

  ArenaScene.prototype.showPop = function (x, y) {
    var pop = this.add.circle(x, y, 12, 0xffffff, 0.32);
    this.tweens.add({
      targets: pop,
      scale: 2,
      alpha: 0,
      duration: CONFIG.feedback.enemyPopMs,
      onComplete: function () {
        pop.destroy();
      }
    });
  };

  function drawRoom(scene) {
    var graphics = scene.add.graphics();
    graphics.fillStyle(CONFIG.canvas.background, 1);
    graphics.fillRect(0, 0, CONFIG.canvas.width, CONFIG.canvas.height);
    graphics.lineStyle(1, 0x15222c, 0.75);

    for (var x = 0; x <= CONFIG.canvas.width; x += 48) {
      graphics.lineBetween(x, 0, x, CONFIG.canvas.height);
    }

    for (var y = 0; y <= CONFIG.canvas.height; y += 48) {
      graphics.lineBetween(0, y, CONFIG.canvas.width, y);
    }

    graphics.lineStyle(2, 0x243846, 1);
    graphics.strokeRect(18, 18, CONFIG.canvas.width - 36, CONFIG.canvas.height - 36);
  }

  function exposeDebugApi(scene) {
    window.__containmentArena = {
      scene: scene,
      grantEnergy: function (amount) {
        scene.state.energy += amount;
        scene.refreshUi();
      },
      getSnapshot: function () {
        return {
          energy: scene.state.energy,
          wave: scene.state.wave,
          totalDefeated: scene.state.totalDefeated,
          enemyCount: scene.enemies.length,
          projectileCount: scene.projectiles.length,
          upgrades: Object.assign({}, scene.state.upgrades),
          stats: ARENA.Upgrades.computeStats(scene.state),
          muted: scene.state.muted
        };
      }
    };
  }

  ARENA.ArenaScene = ArenaScene;
})();
