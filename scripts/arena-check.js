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
  "src/arena/systems/NumberFormat.js",
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

assert(ARENA.UPGRADE_DEFS.length >= 5, "arena should define at least five upgrades");
near(baseStats.clickDamage, ARENA.BALANCE_CONFIG.cursor.clickDamage, "base click damage should come from config");
near(baseStats.clickRadius, ARENA.BALANCE_CONFIG.cursor.clickRadius, "base click radius should come from config");
assert(baseStats.helperCursors === 0, "helper cursors should start locked");

state.energy = 200;
assert(ARENA.Upgrades.buy(state, "heavierCursor"), "Heavier Cursor should be purchasable");
assert(ARENA.Upgrades.buy(state, "widerImpact"), "Wider Impact should be purchasable");
assert(ARENA.Upgrades.buy(state, "doubleTap"), "Double Tap should be purchasable");
assert(ARENA.Upgrades.buy(state, "splatterYield"), "Splatter Yield should be purchasable");
assert(ARENA.Upgrades.buy(state, "autoTapper"), "Auto Tapper should be purchasable");

const upgradedStats = ARENA.Upgrades.computeStats(state);
assert(upgradedStats.clickDamage > baseStats.clickDamage, "damage upgrade should increase click damage");
assert(upgradedStats.clickRadius > baseStats.clickRadius, "radius upgrade should increase click radius");
assert(upgradedStats.doubleTapChance > baseStats.doubleTapChance, "double tap should increase extra-hit chance");
assert(upgradedStats.rewardMultiplier > baseStats.rewardMultiplier, "collector should improve rewards");
assert(upgradedStats.helperCursors === 1, "auto tapper should add a visible helper cursor");

const spentState = ARENA.Save.validateState(JSON.parse(JSON.stringify(state)));
assert(spentState.upgrades.heavierCursor === 1, "save validation should preserve upgrades");
spentState.muted = true;
assert(ARENA.Save.save(spentState), "arena save should write to localStorage test double");
const loaded = ARENA.Save.load();
assert(loaded.muted === true, "mute setting should persist");
assert(loaded.upgrades.autoTapper === 1, "upgrade levels should persist");

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
