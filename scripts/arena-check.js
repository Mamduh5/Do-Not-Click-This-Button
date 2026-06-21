"use strict";

const { readFileSync } = require("node:fs");
const { runInThisContext } = require("node:vm");

global.window = global;
global.Phaser = {
  Math: {
    Angle: {
      Between(x1, y1, x2, y2) {
        return Math.atan2(y2 - y1, x2 - x1);
      }
    },
    Clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    },
    Distance: {
      Between(x1, y1, x2, y2) {
        return Math.hypot(x2 - x1, y2 - y1);
      }
    },
    FloatBetween(min, max) {
      return (min + max) / 2;
    }
  }
};
global.localStorage = {
  store: new Map(),
  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  },
  setItem(key, value) {
    this.store.set(key, String(value));
  },
  removeItem(key) {
    this.store.delete(key);
  }
};

[
  "src/arena/data/arenaBalanceConfig.js",
  "src/arena/data/arenaUpgrades.js",
  "src/arena/data/clickEffectSkins.js",
  "src/arena/data/enemySkins.js",
  "src/arena/data/backgroundSkins.js",
  "src/arena/systems/NumberFormat.js",
  "src/arena/systems/DestructibleBackgroundSystem.js",
  "src/arena/systems/ObstacleSystem.js",
  "src/arena/systems/ClickEffectSkinSystem.js",
  "src/arena/systems/EnemySkinSystem.js",
  "src/arena/systems/SaveSystem.js",
  "src/arena/systems/UpgradeSystem.js",
  "src/arena/systems/SoundSystem.js",
  "src/arena/systems/CursorAttackSystem.js",
  "src/arena/systems/HelperCursorSystem.js"
].forEach((file) => {
  runInThisContext(readFileSync(file, "utf8"), { filename: file });
});

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function near(actual, expected, message) {
  assert(Math.abs(actual - expected) < 0.000001, message + " expected " + expected + " got " + actual);
}

const state = ARENA.Save.createDefaultState();
const baseStats = ARENA.Upgrades.computeStats(state);
const requiredSkinIds = ["meteorImpact", "pixelShatter", "sciFiLaser", "groundBreak", "paperDrop", "arrowStrike"];
const requiredEnemySkinIds = ["ant", "eyes", "tank", "hat", "worm"];
const requiredBackgroundSkinIds = ["containmentFloor", "sand", "water", "town"];

assert(ARENA.UPGRADE_DEFS.length >= 5, "arena should define at least five upgrades");
assert(ARENA.BACKGROUND_SKINS.length >= 1, "arena should define background material profiles");
const backgroundSkin = ARENA.BackgroundSkins.get("containmentFloor");
requiredBackgroundSkinIds.forEach((id) => {
  const skin = ARENA.BackgroundSkins.get(id);
  assert(skin.id === id, id + " background skin should exist");
  assert(skin.unlockedByDefault === true, id + " background skin should be unlocked by default for testing");
  assert(skin.surface && skin.surface.type, id + " should define surface appearance");
  assert(skin.underlayer && skin.underlayer.voidColor !== undefined, id + " should define underlayer appearance");
  assert(skin.repair && skin.repair.durationMs > 0, id + " should define repair behavior");
  assert(skin.damageResponses.groundBreak && skin.damageResponses.pixelShatter, id + " should define Ground Break and Pixel Shatter responses");
});
assert(backgroundSkin.id === "containmentFloor", "Containment Floor background material should exist");
assert(backgroundSkin.surface && backgroundSkin.surface.gridSize > 0, "background material should define surface style");
assert(backgroundSkin.underlayer && backgroundSkin.underlayer.voidColor !== undefined, "background material should define underlayer style");
assert(backgroundSkin.repair && backgroundSkin.repair.durationMs > 0, "background material should define repair style");
assert(backgroundSkin.damageResponses.groundBreak.type === "localizedCollapse", "Ground Break should use material localized collapse response");
assert(backgroundSkin.damageResponses.pixelShatter.type === "localGridBreak", "Pixel Shatter should use material local-grid response");
assert(backgroundSkin.damageResponses.groundBreak.collapseRadius <= 32, "Ground Break collapse should stay compact");
assert(backgroundSkin.damageResponses.groundBreak.shortCrackLengthMax <= 24, "Ground Break should avoid long spider-web spokes");
assert(backgroundSkin.damageResponses.groundBreak.chunkCountMin >= 4, "Ground Break material response should define broken floor chunks");
assert(backgroundSkin.damageResponses.pixelShatter.gridWidthCells > 0 && backgroundSkin.damageResponses.pixelShatter.gridHeightCells > 0, "Pixel Shatter material response should define local grid dimensions");
assert(backgroundSkin.damageResponses.pixelShatter.repairMode === "cell", "Pixel Shatter material response should repair as cells");
const sandSkin = ARENA.BackgroundSkins.get("sand");
assert(sandSkin.damageResponses.groundBreak.type === "sandCrater", "Sand Ground Break should use crater response");
assert(sandSkin.damageResponses.pixelShatter.type === "sandGridDisruption", "Sand Pixel Shatter should use granular grid disruption");
assert(sandSkin.surface.grainDensity > 0 && sandSkin.surface.duneLineAlpha > 0, "Sand should define grain and dune values");
const waterSkin = ARENA.BackgroundSkins.get("water");
assert(waterSkin.damageResponses.groundBreak.type === "waterRipple", "Water Ground Break should use splash/ripple response");
assert(waterSkin.damageResponses.groundBreak.affectsSurface === false, "Water Ground Break should not erase floor holes");
assert(waterSkin.damageResponses.groundBreak.type !== "localizedCollapse", "Water Ground Break should not use crack response");
assert(waterSkin.damageResponses.pixelShatter.type === "waterPixelRipple", "Water Pixel Shatter should use blocky ripple response");
assert(waterSkin.animation && waterSkin.animation.enabled && waterSkin.animation.waveSpeed > 0, "Water should define animated wave config");
const townSkin = ARENA.BackgroundSkins.get("town");
assert(townSkin.damageResponses.groundBreak.type === "townPavementBreak", "Town Ground Break should use pavement response");
assert(townSkin.damageResponses.pixelShatter.type === "townGridDisruption", "Town Pixel Shatter should use town grid disruption");
assert(townSkin.obstacleRules && townSkin.obstacleRules.enabled === true, "Town should enable obstacle rules");
assert(townSkin.obstacleRules.obstacles.length > 0, "Town should define obstacle geometry");
assert(townSkin.obstacleRules.debugOverlay === true, "Town obstacle debug overlay should be configurable");
assert(ARENA.CLICK_EFFECT_SKINS.length >= 6, "arena should define required click effect skins");
const soundSignatures = new Set();
requiredSkinIds.forEach((id) => {
  const skin = ARENA.ClickEffectSkins.get(id);
  assert(skin.id === id, id + " skin should exist");
  assert(skin.unlockedByDefault === true, id + " should be unlocked by default for testing");
  assert(skin.sound && skin.sound.durationSeconds > 0, id + " should define generated sound");
  assert((skin.decal && skin.decal.enabled === true) || (skin.backgroundDamage && skin.backgroundDamage.enabled === true), id + " should define background interaction config");
  soundSignatures.add([skin.sound.frequency, skin.sound.endFrequency, skin.sound.durationSeconds, skin.sound.type].join(":"));
});
assert(soundSignatures.size === requiredSkinIds.length, "all click skins should have unique sound config");
const arrowSkin = ARENA.ClickEffectSkins.get("arrowStrike");
assert(arrowSkin.name === "Arrow Rain", "arrowStrike id should display as Arrow Rain for save compatibility");
["arrowCountMin", "arrowCountMax", "arrowSpawnHeight", "arrowSpawnDistance", "arrowSpreadRadius", "arrowTravelDurationMs", "arrowShaftLength", "arrowShaftWidth", "arrowHeadSize", "trailAlpha", "impactParticleCount", "arrowDecalCount", "punctureDecalDurationMs"].forEach((key) => {
  assert(arrowSkin[key] > 0, "Arrow Rain should define projectile value " + key);
});
assert(arrowSkin.arrowCountMax >= arrowSkin.arrowCountMin && arrowSkin.arrowCountMin >= 3, "Arrow Rain should create multiple arrows");
assert(arrowSkin.arrowShaftColor !== 0x000000, "Arrow Rain shaft should not be a black diagram arrow");
assert(arrowSkin.arrowHeadColor !== undefined, "Arrow Rain should define arrowhead color");
assert(arrowSkin.arrowFeatherColor !== undefined, "Arrow Rain should define feather color");
assert(arrowSkin.trailColor !== undefined, "Arrow Rain should define trail color");
assert(arrowSkin.thunkSound && arrowSkin.thunkSound.durationSeconds > 0, "Arrow Rain should define thunk sound config");
assert(arrowSkin.decal.type === "arrowRain", "Arrow Rain should define arrow rain background decal");
const groundSkin = ARENA.ClickEffectSkins.get("groundBreak");
assert(groundSkin.shakeIntensity === 0, "Ground Break shake should be disabled by default");
assert(groundSkin.collapseRadius <= 32, "Ground Break should define compact collapse radius");
assert(groundSkin.shortCrackCount > 0 && groundSkin.shortCrackLengthMax <= 24, "Ground Break should define short local cracks");
assert(groundSkin.chunkCountMin >= 4 && groundSkin.chunkCountMax <= 8, "Ground Break should define compact floor chunk choreography");
assert(groundSkin.backgroundDamage && groundSkin.backgroundDamage.response === "groundBreak", "Ground Break should request material damage response");
assert(groundSkin.decal.enabled === false, "Ground Break should not use old top-layer sticker decal as primary feedback");
const pixelSkin = ARENA.ClickEffectSkins.get("pixelShatter");
assert(pixelSkin.pixelSize > 0 && pixelSkin.gridWidthCells > 0 && pixelSkin.gridHeightCells > 0, "Pixel Shatter should define local square grid choreography");
assert(pixelSkin.hasSweepingScanline === false, "Pixel Shatter should explicitly remove sweeping scanline");
assert(pixelSkin.localFlickerCount > 0 && pixelSkin.localFlickerDurationMs > 0, "Pixel Shatter should define local flicker only");
assert(pixelSkin.backgroundDamage && pixelSkin.backgroundDamage.response === "pixelShatter", "Pixel Shatter should request material damage response");
assert(pixelSkin.decal.enabled === false, "Pixel Shatter should not use old top-layer sticker decal as primary feedback");
assert(ARENA.DestructibleBackground && typeof ARENA.DestructibleBackground.create === "function", "destructible background system should exist");
assert(ARENA.BALANCE_CONFIG.destructibleBackground.enabled === true, "destructible background should be configurable and enabled");
assert(ARENA.BALANCE_CONFIG.destructibleBackground.useRenderTexture === true, "destructible background should prefer RenderTexture");
assert(ARENA.BALANCE_CONFIG.destructibleBackground.maxDamageMarks > 0, "destructible damage marks should be capped");
assert(ARENA.BALANCE_CONFIG.destructibleBackground.maxTemporaryChunks > 0, "destructible temporary chunks should be capped");
assert(ARENA.BALANCE_CONFIG.destructibleBackground.repairDelayMs > 0, "destructible repair delay should be configurable");
assert(ARENA.BALANCE_CONFIG.destructibleBackground.repairDurationMs > 0, "destructible repair duration should be configurable");
assert(!ARENA.BALANCE_CONFIG.feedback.sharedBlackCircle, "no shared generic black circle config should exist");
assert(ARENA.EnemySkins.setActive(ARENA.Save.createDefaultState(), "tree") === false, "removed Tree skin should not be selectable");
requiredEnemySkinIds.forEach((id) => {
  const skin = ARENA.EnemySkins.get(id);
  assert(skin.id === id, id + " enemy skin should exist");
  assert(skin.unlockedByDefault === true, id + " enemy skin should be unlocked by default");
  assert(skin.animation && typeof skin.animation.forwardAngleOffset === "number", id + " should define forward orientation config");
  assert(skin.animation.rotationSmoothing > 0, id + " should define rotation smoothing");
  assert(skin.animation.bodyWobbleSpeed > 0, id + " should define movement animation speed");
  assert(skin.animation.hitSquashDurationMs > 0, id + " should define hit squash duration");
  assert(skin.animation.deathFadeMs > 0, id + " should define death animation value");
});
const antSkin = ARENA.EnemySkins.get("ant");
assert(antSkin.ant && antSkin.ant.segmentCount === 3, "Ant should define three segmented body sections");
assert(antSkin.ant.legPairs === 3, "Ant should define three leg pairs");
assert(antSkin.ant.waistWidth > 0, "Ant should define narrow waist config");
assert(antSkin.ant.abdomenRadius >= 0.64, "Ant rear abdomen should be explicitly larger");
assert(antSkin.scale < 1, "Ant should be slightly smaller");
assert(antSkin.bodyColor !== 0x161312 && antSkin.accentColor > antSkin.bodyColor, "Ant should use red/dark red colors");
const wormSkin = ARENA.EnemySkins.get("worm");
assert(wormSkin.worm && wormSkin.worm.segmentCount >= 6, "Worm should define segmented body config");
assert(wormSkin.animation.wormWiggleAmplitude > 0, "Worm should define crawl wiggle animation");
assert(state.activeClickSkin === "meteorImpact", "default active click skin");
assert(state.unlockedClickSkins.groundBreak === true, "default unlocked click skins");
assert(state.activeEnemySkin === "ant", "default enemy skin");
assert(state.activeBackgroundSkin === "containmentFloor", "default active background material");
assert(state.unlockedEnemySkins.hat === true, "default unlocked enemy skins");
assert(state.unlockedBackgroundSkins.containmentFloor === true, "default background material should be unlocked");
assert(state.unlockedBackgroundSkins.sand === true, "sand background should be unlocked by default");
assert(state.unlockedBackgroundSkins.water === true, "water background should be unlocked by default");
assert(state.unlockedBackgroundSkins.town === true, "town background should be unlocked by default");
assert(state.unlockedEnemySkins.worm === true, "worm enemy skin should be unlocked by default");
assert(!state.unlockedEnemySkins.tree, "tree enemy skin should not be unlocked by default");
assert(ARENA.BALANCE_CONFIG.backgroundEffects.maxDecals > 0, "background decal cap should be configured");
assert(ARENA.BALANCE_CONFIG.feedback.comboPopupMs > 0, "combo popup duration should be configurable");
assert(ARENA.BALANCE_CONFIG.feedback.comboMilestones.indexOf(5) >= 0, "combo milestone thresholds should be configurable");
assert(ARENA.BALANCE_CONFIG.feedback.comboColors.length >= 3, "combo colors should be configurable");
assert(ARENA.BALANCE_CONFIG.audio.sounds.comboTick.durationSeconds > 0, "combo sound should be configurable");
near(baseStats.clickDamage, ARENA.BALANCE_CONFIG.cursor.clickDamage, "base click damage should come from config");
near(baseStats.clickRadius, ARENA.BALANCE_CONFIG.cursor.clickRadius, "base click radius should come from config");
assert(baseStats.helperCursors === 0, "helper cursors should start locked");
assert(ARENA.BALANCE_CONFIG.enemy.clickPadding > 0, "enemy click padding should be configurable");
assert(ARENA.BALANCE_CONFIG.enemy.speedVariance > 0, "enemy speed variance should be configurable");
assert(ARENA.BALANCE_CONFIG.cursor.helperTravelSpeed > 0, "helper travel speed should be configurable");
assert(ARENA.BALANCE_CONFIG.cursor.helperMaxTravelDurationMs > 0, "helper max travel duration should be configurable");
assert(ARENA.BALANCE_CONFIG.cursor.helperRetreatDistance > 0, "helper retreat distance should be configurable");
assert(ARENA.BALANCE_CONFIG.cursor.helperWanderRadius > 0, "helper wander radius should be configurable");
assert(ARENA.BALANCE_CONFIG.cursor.helperWanderSpeed > 0, "helper wander speed should be configurable");
assert(ARENA.BALANCE_CONFIG.cursor.helperTargetReacquireDelayMs > 0, "helper target reacquire delay should be configurable");
assert(ARENA.BALANCE_CONFIG.cursor.helperClickEffectScale > 0, "helper click effect scale should be configurable");
assert(ARENA.BALANCE_CONFIG.feedback.hitParticleCount > 0, "hit particles should be configurable");
assert(ARENA.BALANCE_CONFIG.audio.sounds.kill.durationSeconds > 0, "sound tone duration should be configurable");

state.energy = 200;
assert(ARENA.Upgrades.buy(state, "heavierCursor"), "Heavier Cursor should be purchasable");
assert(ARENA.Upgrades.buy(state, "widerImpact"), "Wider Impact should be purchasable");
assert(ARENA.Upgrades.buy(state, "doubleTap"), "Double Tap should be purchasable");
assert(ARENA.Upgrades.buy(state, "splatterYield"), "Splatter Yield should be purchasable");
assert(ARENA.Upgrades.buy(state, "shockClick"), "Shock Click should be purchasable");
assert(ARENA.Upgrades.buy(state, "autoTapper"), "Auto Tapper should be purchasable");

const upgradedStats = ARENA.Upgrades.computeStats(state);
assert(upgradedStats.clickDamage > baseStats.clickDamage, "damage upgrade should increase click damage");
assert(upgradedStats.clickRadius > baseStats.clickRadius, "radius upgrade should increase click radius");
assert(upgradedStats.doubleTapChance > baseStats.doubleTapChance, "double tap should increase extra-hit chance");
assert(upgradedStats.rewardMultiplier > baseStats.rewardMultiplier, "collector should improve rewards");
assert(upgradedStats.shockRadius > baseStats.shockRadius, "shock click should add area radius");
assert(upgradedStats.helperCursors === 1, "auto tapper should add a visible helper cursor");
assert(upgradedStats.helperTravelSpeed === ARENA.BALANCE_CONFIG.cursor.helperTravelSpeed, "helper travel speed should flow through computed stats");
assert(upgradedStats.helperClickEffectScale === ARENA.BALANCE_CONFIG.cursor.helperClickEffectScale, "helper click effect scale should flow through computed stats");
assert(ARENA.HelperCursors.STATES.TRAVEL_TO_TARGET === "travelToTarget", "helper cursor should expose travel state");
assert(ARENA.HelperCursors.STATES.COOLDOWN_WANDER === "cooldownWander", "helper cursor should expose cooldown wander state");

const spentState = ARENA.Save.validateState(JSON.parse(JSON.stringify(state)));
assert(spentState.upgrades.heavierCursor === 1, "save validation should preserve upgrades");
assert(ARENA.ClickEffectSkins.setActive(spentState, "sciFiLaser"), "skin switch should update active skin");
assert(spentState.activeClickSkin === "sciFiLaser", "active skin should switch");
const statsAfterClickSkin = ARENA.Upgrades.computeStats(spentState);
assert(ARENA.EnemySkins.setActive(spentState, "eyes"), "enemy skin switch should update active enemy skin");
assert(spentState.activeEnemySkin === "eyes", "active enemy skin should switch");
const statsAfterEnemySkin = ARENA.Upgrades.computeStats(spentState);
near(statsAfterClickSkin.clickDamage, statsAfterEnemySkin.clickDamage, "skin switching should not change click damage");
near(statsAfterClickSkin.clickRadius, statsAfterEnemySkin.clickRadius, "skin switching should not change click radius");
spentState.muted = true;
assert(ARENA.Save.save(spentState), "arena save should write to localStorage test double");
const loaded = ARENA.Save.load();
assert(loaded.muted === true, "mute setting should persist");
assert(loaded.upgrades.autoTapper === 1, "upgrade levels should persist");
assert(loaded.activeClickSkin === "sciFiLaser", "active skin should persist");
assert(loaded.unlockedClickSkins.meteorImpact === true, "unlocked skins should persist");
assert(loaded.activeEnemySkin === "eyes", "active enemy skin should persist");
assert(loaded.unlockedEnemySkins.ant === true, "unlocked enemy skins should persist");
assert(loaded.activeBackgroundSkin === "containmentFloor", "active background material should persist");

assert(ARENA.BackgroundSkins.setActive(loaded, "water"), "background skin switch should update active background skin");
assert(loaded.activeBackgroundSkin === "water", "active background skin should switch");
assert(ARENA.Save.save(loaded), "arena save should persist switched background skin");
const loadedBackground = ARENA.Save.load();
assert(loadedBackground.activeBackgroundSkin === "water", "active background skin should persist through save/load");
const invalidBackground = ARENA.Save.validateState({
  activeBackgroundSkin: "lava",
  unlockedBackgroundSkins: { lava: true },
  upgrades: {}
});
assert(invalidBackground.activeBackgroundSkin === "containmentFloor", "invalid saved background skin should fall back safely");

const obstacleSystem = ARENA.Obstacles.create({
  add: {
    graphics() {
      return {
        setDepth() {},
        lineStyle() {},
        strokeRect() {},
        fillStyle() {},
        fillRect() {},
        destroy() {}
      };
    }
  }
}, townSkin);
assert(obstacleSystem.obstacles.length === townSkin.obstacleRules.obstacles.length, "ObstacleSystem should load town obstacles");
const obstacle = obstacleSystem.obstacles[0];
const safeSpawn = ARENA.Obstacles.getSafeSpawnPoint(obstacleSystem, obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height / 2, ARENA.BALANCE_CONFIG.enemy.radius);
assert(safeSpawn.adjusted === true, "ObstacleSystem should move spawn points out of town obstacles");
assert(!ARENA.Obstacles.isPointInside(obstacleSystem, safeSpawn.x, safeSpawn.y, ARENA.BALANCE_CONFIG.enemy.radius), "adjusted spawn should not remain inside obstacle");
const enemyForAvoidance = { x: obstacle.left - 6, y: obstacle.y + obstacle.height / 2, radius: ARENA.BALANCE_CONFIG.enemy.radius, driftAngle: 0 };
const avoided = ARENA.Obstacles.avoidMovement(obstacleSystem, enemyForAvoidance, enemyForAvoidance.x, enemyForAvoidance.y, obstacle.left + 4, enemyForAvoidance.y);
assert(avoided.adjusted === true, "ObstacleSystem should adjust projected movement into an obstacle");
assert(!ARENA.Obstacles.isPointInside(obstacleSystem, avoided.x, avoided.y, ARENA.BALANCE_CONFIG.enemy.radius), "adjusted movement should not remain inside obstacle");
const obstacleSnapshot = ARENA.Obstacles.getSnapshot(obstacleSystem, [{ active: true, x: safeSpawn.x, y: safeSpawn.y, radius: ARENA.BALANCE_CONFIG.enemy.radius }]);
assert(obstacleSnapshot.debugOverlay === true, "Town obstacle debug snapshot should exist");
assert(obstacleSnapshot.enemiesInsideObstacles === 0, "safe enemy snapshot should not report obstacle overlap");

const migratedTreeSave = ARENA.Save.validateState({
  activeEnemySkin: "tree",
  unlockedEnemySkins: { tree: true },
  activeClickSkin: "arrowStrike",
  unlockedClickSkins: { arrowStrike: true },
  upgrades: {}
});
assert(migratedTreeSave.activeEnemySkin === "ant", "save with removed Tree skin should fall back safely");
assert(migratedTreeSave.unlockedEnemySkins.worm === true, "validated saves should unlock Worm by default");
assert(!migratedTreeSave.unlockedEnemySkins.tree, "validated saves should not preserve removed Tree unlock");

const nearEnemy = { active: true, x: 20, y: 0, radius: 8 };
const farEnemy = { active: true, x: 35, y: 0, radius: 8 };
assert(ARENA.CursorAttack.findTargets([nearEnemy, farEnemy], 0, 0, baseStats.clickRadius).length === 1, "base click radius should detect nearby enemy");
assert(ARENA.CursorAttack.findTargets([nearEnemy, farEnemy], 0, 0, upgradedStats.clickRadius).length === 2, "upgraded click radius should detect wider enemies");

const reset = ARENA.Save.reset();
assert(reset.energy === 0, "reset should clear energy");
assert(Object.keys(reset.upgrades).length === 0, "reset should clear upgrades");
assert(reset.muted === false, "reset should restore mute default");

const sound = ARENA.createSoundSystem(reset);
assert(sound.isSupported() === false, "arena sound should tolerate missing AudioContext in checks");
assert(sound.play("clickMiss") === false, "arena sound should not throw before browser unlock");

console.log("Arena checks passed.");
