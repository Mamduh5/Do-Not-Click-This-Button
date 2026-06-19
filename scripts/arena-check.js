"use strict";

const { readFileSync } = require("node:fs");
const { runInThisContext } = require("node:vm");

global.window = global;
global.Phaser = {
  Math: {
    Distance: {
      Between(x1, y1, x2, y2) {
        return Math.hypot(x2 - x1, y2 - y1);
      }
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
  "src/arena/systems/NumberFormat.js",
  "src/arena/systems/ClickEffectSkinSystem.js",
  "src/arena/systems/EnemySkinSystem.js",
  "src/arena/systems/SaveSystem.js",
  "src/arena/systems/UpgradeSystem.js",
  "src/arena/systems/SoundSystem.js",
  "src/arena/systems/CursorAttackSystem.js"
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
const requiredEnemySkinIds = ["ant", "eyes", "tank", "tree", "hat"];

assert(ARENA.UPGRADE_DEFS.length >= 5, "arena should define at least five upgrades");
assert(ARENA.CLICK_EFFECT_SKINS.length >= 6, "arena should define required click effect skins");
const soundSignatures = new Set();
requiredSkinIds.forEach((id) => {
  const skin = ARENA.ClickEffectSkins.get(id);
  assert(skin.id === id, id + " skin should exist");
  assert(skin.unlockedByDefault === true, id + " should be unlocked by default for testing");
  assert(skin.sound && skin.sound.durationSeconds > 0, id + " should define generated sound");
  assert(skin.decal && skin.decal.enabled === true, id + " should define background decal config");
  soundSignatures.add([skin.sound.frequency, skin.sound.endFrequency, skin.sound.durationSeconds, skin.sound.type].join(":"));
});
assert(soundSignatures.size === requiredSkinIds.length, "all click skins should have unique sound config");
assert(!ARENA.BALANCE_CONFIG.feedback.sharedBlackCircle, "no shared generic black circle config should exist");
requiredEnemySkinIds.forEach((id) => {
  const skin = ARENA.EnemySkins.get(id);
  assert(skin.id === id, id + " enemy skin should exist");
  assert(skin.unlockedByDefault === true, id + " enemy skin should be unlocked by default");
});
assert(state.activeClickSkin === "meteorImpact", "default active click skin");
assert(state.unlockedClickSkins.groundBreak === true, "default unlocked click skins");
assert(state.activeEnemySkin === "ant", "default enemy skin");
assert(state.unlockedEnemySkins.hat === true, "default unlocked enemy skins");
assert(ARENA.BALANCE_CONFIG.backgroundEffects.maxDecals > 0, "background decal cap should be configured");
near(baseStats.clickDamage, ARENA.BALANCE_CONFIG.cursor.clickDamage, "base click damage should come from config");
near(baseStats.clickRadius, ARENA.BALANCE_CONFIG.cursor.clickRadius, "base click radius should come from config");
assert(baseStats.helperCursors === 0, "helper cursors should start locked");
assert(ARENA.BALANCE_CONFIG.enemy.clickPadding > 0, "enemy click padding should be configurable");
assert(ARENA.BALANCE_CONFIG.enemy.speedVariance > 0, "enemy speed variance should be configurable");
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
