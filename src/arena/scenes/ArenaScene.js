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
    this.effectCounts = {};
    this.enemySerial = 0;
    this.spawningEnabled = true;
    this.core = { x: CONFIG.canvas.width / 2, y: CONFIG.canvas.height / 2 };

    drawRoom(this);
    this.destructibleBackgroundSystem = ARENA.DestructibleBackground.create(this);
    this.waterSurfaceSystem = ARENA.WaterSurface.create(this, ARENA.BackgroundSkins.get(this.state.activeBackgroundSkin));
    this.obstacleSystem = ARENA.Obstacles.create(this, ARENA.BackgroundSkins.get(this.state.activeBackgroundSkin));
    this.townNavigationSystem = ARENA.TownNavigation.create(this, ARENA.BackgroundSkins.get(this.state.activeBackgroundSkin));
    this.backgroundEffectSystem = ARENA.BackgroundEffects.create(this);
    this.helperCursorSystem = ARENA.HelperCursors.create(this);
    this.input.on("pointerdown", this.handlePointerDown, this);

    this.hud = ARENA.createArenaHud({
      onToggleMute: this.toggleMute.bind(this),
      onReset: this.resetPrototype.bind(this),
      onSetClickSkin: this.setClickSkin.bind(this),
      onSetEnemySkin: this.setEnemySkin.bind(this),
      onSetBackgroundSkin: this.setBackgroundSkin.bind(this)
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
    ARENA.DestructibleBackground.update(this.destructibleBackgroundSystem, time);
    ARENA.WaterSurface.update(this.waterSurfaceSystem, time);
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
    if (!this.spawningEnabled) {
      return;
    }

    if (this.enemies.length >= CONFIG.enemy.maxEnemies) {
      return;
    }

    var spawnInterval = Math.max(
      CONFIG.enemy.minimumSpawnIntervalMs,
      CONFIG.enemy.spawnIntervalMs * Math.pow(0.94, this.state.wave - 1)
    );

    while (this.spawnAccumulatorMs >= spawnInterval) {
      this.spawnAccumulatorMs -= spawnInterval;
      for (var index = 0; index < CONFIG.enemy.spawnBurst; index += 1) {
        if (this.enemies.length < CONFIG.enemy.maxEnemies) {
          this.enemies.push(ARENA.Enemies.spawn(this, this.state.wave));
        }
      }
    }
  };

  ArenaScene.prototype.handlePointerDown = function (pointer) {
    var point = pointer.positionToCamera(this.cameras.main);
    this.soundSystem.unlock();
    ARENA.CursorAttack.attack(this, point.x, point.y, this.stats);
    this.refreshUi();
  };

  ArenaScene.prototype.registerKill = function (x, y) {
    this.combo += 1;
    this.comboExpiresAt = this.time.now + CONFIG.cursor.comboWindowMs;

    if (this.combo > 1) {
      ARENA.ImpactEffects.showComboPopup(this, this.combo, x || CONFIG.canvas.width / 2, y || 98);
      this.soundSystem.play("comboTick");
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
    this.state = ARENA.Save.reset();
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
    this.hud.update(this.state, this.combo);
    this.panel.update(this.state);
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
        var destructibleSnapshot = ARENA.DestructibleBackground.getSnapshot(scene.destructibleBackgroundSystem);
        var waterSurfaceSnapshot = ARENA.WaterSurface.getSnapshot(scene.waterSurfaceSystem);
        var obstacleSnapshot = ARENA.Obstacles.getSnapshot(scene.obstacleSystem, scene.enemies);
        var townNavigationSnapshot = ARENA.TownNavigation.getSnapshot(scene.townNavigationSystem, scene.enemies);
        window.__arenaDebug = {
          activeBackgroundSkin: scene.state.activeBackgroundSkin,
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
          muted: scene.state.muted
        };
      }
    };
  }

  ARENA.ArenaScene = ArenaScene;
})();
