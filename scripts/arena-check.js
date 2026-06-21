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
    Between(min, max) {
      return Math.floor((min + max) / 2);
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
  "src/arena/systems/WaterSurfaceSystem.js",
  "src/arena/systems/DestructibleBackgroundSystem.js",
  "src/arena/systems/ObstacleSystem.js",
  "src/arena/systems/TownNavigationSystem.js",
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
assert(sandSkin.surface.grainDensity > 0 && sandSkin.surface.grainAlpha > 0, "Sand should define grain values");
assert(sandSkin.surface.duneLineCount > 0 && sandSkin.surface.duneLineAlpha > 0, "Sand should define dune values");
assert(sandSkin.surface.sandTexture && sandSkin.surface.sandTexture.patchCount > 0, "Sand texture config should exist");
assert(sandSkin.surface.sandTexture.fineGrainCount >= 500, "Sand texture should define dense fine grain");
assert(sandSkin.surface.sandTexture.windStreakCount > 0 && sandSkin.surface.sandTexture.depressionCount > 0, "Sand texture should define wind streaks and depressions");
assert(sandSkin.surface.assetComposition && sandSkin.surface.assetComposition.enabled === true, "Sand should enable asset composition");
assert(sandSkin.surface.assetComposition.baseKey === "arenaSandBaseMap", "Sand should use approved base map asset key");
assert(sandSkin.surface.assetComposition.overlays.length >= 3, "Sand overlays should be config-driven");
assert(sandSkin.surface.assetComposition.overlays.some((overlay) => overlay.key === "arenaSandDuneOverlay" && overlay.count >= 2), "Sand should configure dune overlay stamps");
assert(sandSkin.surface.assetComposition.overlays.some((overlay) => overlay.key === "arenaSandDepression" && overlay.count >= 2), "Sand should configure depression stamps");
assert(sandSkin.surface.assetComposition.overlays.some((overlay) => overlay.key === "arenaSandWindStreaks" && overlay.count >= 2), "Sand should configure wind streak overlays");
assert(sandSkin.damageResponses.groundBreak.craterSoftness > 0, "Sand Ground Break should define crater softness");
const waterSkin = ARENA.BackgroundSkins.get("water");
assert(waterSkin.damageResponses.groundBreak.type === "waterRipple", "Water Ground Break should use splash/ripple response");
assert(waterSkin.damageResponses.groundBreak.affectsSurface === false, "Water Ground Break should not erase floor holes");
assert(waterSkin.damageResponses.groundBreak.type !== "localizedCollapse", "Water Ground Break should not use crack response");
assert(waterSkin.damageResponses.pixelShatter.type === "waterPixelRipple", "Water Pixel Shatter should use blocky ripple response");
assert(waterSkin.animation && waterSkin.animation.enabled && waterSkin.animation.waveSpeed > 0, "Water should define animated wave config");
assert(waterSkin.animation.waveLineCount > 0 && waterSkin.animation.waveAmplitude > 0 && waterSkin.animation.waveAlpha > 0, "Water should define active wave values");
assert(waterSkin.animation.shimmerCount > 0 && waterSkin.animation.shimmerSpeed > 0, "Water should define shimmer values");
assert(waterSkin.animation.rippleMaxCount > 0 && waterSkin.animation.rippleDurationMs > 0, "Water should define capped ripple values");
assert(waterSkin.damageResponses.groundBreak.splashRadius > 0 && waterSkin.damageResponses.groundBreak.foamCount > 0, "Water Ground Break should define splash and foam values");
assert(waterSkin.waterSurface && waterSkin.waterSurface.enabled === true, "Water should define reactive water surface config");
assert(waterSkin.waterSurface.visualEnabled === true && waterSkin.waterSurface.rippleRingMax > 0, "Water surface should define visible renderer config");
assert(waterSkin.waterSurface.debugGridVisible === false && waterSkin.waterSurface.showEnergyCells === false, "Water debug grid/energy cells should be hidden in normal play");
assert(waterSkin.waterSurface.splash && waterSkin.waterSurface.splash.arcCountMin > 0 && waterSkin.waterSurface.splash.dropletCount > 0, "Water splash config should define broken arcs and droplets");
assert(waterSkin.surface.waterTexture && waterSkin.surface.waterTexture.causticCount > 0, "Water texture config should exist");
assert(waterSkin.surface.assetComposition && waterSkin.surface.assetComposition.enabled === true, "Water should enable asset composition");
assert(waterSkin.surface.assetComposition.baseKey === "arenaWaterBaseMap", "Water should use approved base map asset key");
assert(waterSkin.surface.assetComposition.overlays.some((overlay) => overlay.key === "arenaWaterCausticOverlay" && overlay.alphaMax <= 0.18), "Water caustic asset overlay should be low alpha");
assert(waterSkin.waterSurface.causticAssetOverlay && waterSkin.waterSurface.causticAssetOverlay.alphaMax <= 0.18, "Water animated caustic overlay should stay subtle");
assert(waterSkin.waterSurface.splashAssets && waterSkin.waterSurface.splashAssets.enabled === true, "Water should enable splash asset sprites");
assert(waterSkin.waterSurface.splashAssets.crownKey === "arenaWaterSplashCrown", "Water splash should use approved crown asset key");
assert(waterSkin.waterSurface.splashAssets.foamKey === "arenaWaterFoamBurst", "Water splash should use approved foam asset key");
assert(waterSkin.waterSurface.splashAssets.geometryArcPrimary === false, "Water splash geometry arcs should not be the primary renderer");
assert(waterSkin.waterSurface.gridCols > 0 && waterSkin.waterSurface.gridRows > 0, "Water surface should define a low-resolution ripple grid");
assert(waterSkin.waterSurface.propagation > 0 && waterSkin.waterSurface.damping > 0, "Water surface should define propagation and damping");
assert(waterSkin.waterSurface.effectImpulseScale.meteor > waterSkin.waterSurface.effectImpulseScale.groundBreak, "Meteor should create stronger water impulse than Ground Break");
const townSkin = ARENA.BackgroundSkins.get("town");
assert(townSkin.damageResponses.groundBreak.type === "townPavementBreak", "Town Ground Break should use pavement response");
assert(townSkin.damageResponses.pixelShatter.type === "townGridDisruption", "Town Pixel Shatter should use town grid disruption");
assert(townSkin.obstacleRules && townSkin.obstacleRules.enabled === true, "Town should enable obstacle rules");
assert(townSkin.obstacleRules.obstacles.length > 0, "Town should define obstacle geometry");
assert(townSkin.obstacleRules.debugOverlay === true, "Town obstacle debug overlay should be configurable");
assert(townSkin.surface.roads.length > 0 && townSkin.surface.buildingRects.length > 0, "Town should define roads and buildings from config");
assert(townSkin.surface.map && townSkin.surface.map.roadCount > 0 && townSkin.surface.map.buildingCount === townSkin.surface.buildingRects.length, "Town should define map debug counts");
assert(townSkin.surface.treeCircles.length > 0 && townSkin.surface.map.treeCount === townSkin.surface.treeCircles.length, "Town should define tree obstacles from config");
assert(townSkin.surface.townTexture && townSkin.surface.townTexture.textureNoiseDensity > 0, "Town texture config should exist");
assert(townSkin.obstacleRules.spawnClearance > 0 && townSkin.obstacleRules.stuckDetectionMs > 0, "Town should define spawn clearance and stuck detection config");
assert(townSkin.obstacleRules.movementMode === "freeRoamObstacles", "Town movement should be free-roam obstacle mode");
assert(townSkin.obstacleRules.obstacles.some((obstacle) => obstacle.type === "tree" && obstacle.shape === "circle"), "Town should define circular tree blockers");
assert(townSkin.navigation && townSkin.navigation.enabled === false, "Town lane navigation should not be the primary movement mode");
assert(townSkin.navigation.cellSize > 0 && townSkin.navigation.maxPathLength > 0, "Town navigation should define grid and path caps");
assert(townSkin.navigation.roads.length > 0 && townSkin.navigation.buildings.length === townSkin.surface.buildingRects.length, "Town navigation should define roads and blocked buildings");
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
        strokeCircle() {},
        fillStyle() {},
        fillRect() {},
        fillCircle() {},
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
assert(obstacleSnapshot.townMap && obstacleSnapshot.townMap.roadCount > 0 && obstacleSnapshot.townMap.buildingCount === townSkin.surface.buildingRects.length, "Town map debug snapshot should expose roads and buildings");
assert(obstacleSnapshot.townMap.movementMode === "freeRoamObstacles", "Town map debug should expose free-roam obstacle movement");
assert(obstacleSnapshot.townMap.treeCount === townSkin.surface.treeCircles.length, "Town map debug should expose trees");
assert(typeof obstacleSnapshot.blockedMoveCount === "number" && typeof obstacleSnapshot.pushOutCount === "number", "Obstacle debug should expose push-out and blocked move counts");
assert(obstacleSnapshot.stuckEnemyCount === 0, "Obstacle snapshot should expose stuck enemy count");
const treeObstacle = obstacleSystem.obstacles.find((item) => item.type === "tree");
assert(treeObstacle && ARENA.Obstacles.isPointInside(obstacleSystem, treeObstacle.x, treeObstacle.y, ARENA.BALANCE_CONFIG.enemy.radius), "Tree obstacle should block enemy centers");
const stuckEnemy = { active: true, x: 240, y: 240, radius: ARENA.BALANCE_CONFIG.enemy.radius, driftAngle: 0 };
ARENA.Obstacles.updateEnemyState(obstacleSystem, stuckEnemy, stuckEnemy.x, stuckEnemy.y, townSkin.obstacleRules.stuckDetectionMs + 1, 1000);
assert(stuckEnemy.obstacleStuck === true, "ObstacleSystem should mark stuck enemies after configured delay");
const stuckSnapshot = ARENA.Obstacles.getSnapshot(obstacleSystem, [stuckEnemy]);
assert(stuckSnapshot.stuckEnemyCount === 1 && stuckSnapshot.townMap.stuckEnemyCount === 1, "Obstacle snapshot should count stuck enemies");

const fakeScene = {
  time: { now: 0 },
  effectCounts: {},
  add: {
    graphics() {
      return {
        setDepth() {},
        clear() {},
        fillStyle() {},
        fillCircle() {},
        fillRect() {},
        destroy() {}
      };
    },
    arc() {
      return {
        active: true,
        rotation: 0,
        setStrokeStyle() {},
        setDepth() {},
        destroy() {
          this.active = false;
        }
      };
    },
    ellipse() {
      return {
        active: true,
        setDepth() {},
        destroy() {
          this.active = false;
        }
      };
    },
    circle() {
      return {
        active: true,
        setStrokeStyle() {},
        setDepth() {},
        destroy() {
          this.active = false;
        }
      };
    },
    image(x, y, key) {
      return {
        active: true,
        x,
        y,
        key,
        scaleX: 1,
        scaleY: 1,
        alpha: 1,
        setOrigin() {
          return this;
        },
        setDepth() {
          return this;
        },
        setAlpha(value) {
          this.alpha = value;
          return this;
        },
        setScale(value) {
          this.scaleX = value;
          this.scaleY = value;
          return this;
        },
        setRotation(value) {
          this.rotation = value;
          return this;
        },
        destroy() {
          this.active = false;
        }
      };
    }
  },
  textures: {
    exists() {
      return true;
    },
    get() {
      return {
        getSourceImage() {
          return { width: 960, height: 620 };
        }
      };
    }
  },
  tweens: {
    add() {}
  }
};

assert(ARENA.WaterSurface && typeof ARENA.WaterSurface.create === "function", "WaterSurfaceSystem should exist");
const waterSurfaceSystem = ARENA.WaterSurface.create(fakeScene, waterSkin);
assert(ARENA.WaterSurface.getSnapshot(waterSurfaceSystem).active === true, "Selecting Water should activate water surface system");
assert(ARENA.WaterSurface.getSnapshot(waterSurfaceSystem).visualEnabled === true, "Water surface should expose visible renderer debug");
assert(ARENA.WaterSurface.getSnapshot(waterSurfaceSystem).usesAssetSplash === true, "Water surface should use asset splash sprites when textures are loaded");
const groundImpulse = ARENA.WaterSurface.addImpulse(waterSurfaceSystem, "groundBreak", 240, 220, 1);
const meteorImpulse = ARENA.WaterSurface.addImpulse(waterSurfaceSystem, "meteor", 260, 220, 1);
const arrowImpulse = ARENA.WaterSurface.addImpulse(waterSurfaceSystem, "arrowRain", 280, 220, 1);
assert(groundImpulse.count === 1, "Ground Break on Water should create one central impulse");
assert(meteorImpulse.strength > groundImpulse.strength, "Meteor on Water should create stronger impulse than Ground Break");
assert(arrowImpulse.count > 1, "Arrow Rain on Water should create multiple small impulses");
assert(ARENA.WaterSurface.getSnapshot(waterSurfaceSystem).activeSplashSpriteCount > 0, "Water clicks should create visible asset splash sprites");
assert(ARENA.WaterSurface.getSnapshot(waterSurfaceSystem).activeFoamSpriteCount > 0, "Strong Water clicks should create visible foam asset sprites");
assert(ARENA.WaterSurface.getSnapshot(waterSurfaceSystem).activeArcCount === 0, "Water asset splashes should not use broken arcs as the primary feedback");
assert(ARENA.WaterSurface.getSnapshot(waterSurfaceSystem).geometryArcPrimary === false, "Water debug should report geometry arcs are not primary");
assert(ARENA.WaterSurface.getSnapshot(waterSurfaceSystem).fullCircleRippleCount === 0, "Water should not create full-circle ripple visuals");
assert(ARENA.WaterSurface.getSnapshot(waterSurfaceSystem).debugGridVisible === false && ARENA.WaterSurface.getSnapshot(waterSurfaceSystem).showEnergyCells === false, "Water debug grid visuals should remain disabled");
fakeScene.time.now = 100;
ARENA.WaterSurface.update(waterSurfaceSystem, 100);
const activeEnergy = ARENA.WaterSurface.getSnapshot(waterSurfaceSystem).averageEnergy;
for (let tick = 2; tick < 46; tick += 1) {
  fakeScene.time.now = tick * 100;
  ARENA.WaterSurface.update(waterSurfaceSystem, tick * 100);
}
const settledEnergy = ARENA.WaterSurface.getSnapshot(waterSurfaceSystem).averageEnergy;
assert(activeEnergy > 0, "Water ripple field should accumulate energy after impulses");
assert(settledEnergy < activeEnergy, "Water ripple field should settle after damping updates");
assert(ARENA.WaterSurface.getSnapshot(waterSurfaceSystem).lastImpulseType === "arrowRain", "Water debug should expose last impulse type");

assert(ARENA.TownNavigation && typeof ARENA.TownNavigation.create === "function", "TownNavigationSystem should still exist as optional fallback");
const townNavigationSystem = ARENA.TownNavigation.create(fakeScene, townSkin);
const townNavigationSnapshot = ARENA.TownNavigation.getSnapshot(townNavigationSystem, []);
assert(townNavigationSnapshot.active === false, "Town navigation should be inactive for free-roam obstacle mode");

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
