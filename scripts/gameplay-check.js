"use strict";

const { readFileSync } = require("node:fs");
const { runInThisContext } = require("node:vm");

global.window = global;

[
  "src/game/systems/NumberFormat.js",
  "src/game/systems/GameState.js",
  "src/game/data/upgrades.js",
  "src/game/systems/UpgradeSystem.js",
  "src/game/systems/InstabilitySystem.js"
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

const state = DNC.createDefaultState();
near(state.instabilityPerClick, 0.65, "base instability per click");

state.power = 200;
assert(DNC.Upgrades.buy(state, "powerTap"), "Power Tap should be affordable at 200 power");
assert(DNC.Upgrades.buy(state, "autoPress"), "Auto-Presser should be affordable after Power Tap");
near(state.powerPerClick, 2, "powerTap recompute");
near(state.powerPerSecond, 1, "autoPress power recompute");
near(state.instabilityPerSecond, 0.12, "autoPress instability recompute");

const saved = JSON.parse(JSON.stringify(state));
const loaded = DNC.validateState(saved);
near(loaded.powerPerClick, state.powerPerClick, "loaded click stat should match recomputed stat");
near(loaded.powerPerSecond, state.powerPerSecond, "loaded passive stat should match recomputed stat");
near(loaded.instabilityPerSecond, state.instabilityPerSecond, "loaded instability stat should match recomputed stat");

const unaffordable = DNC.createDefaultState();
assert(!DNC.Upgrades.canBuy(unaffordable, "powerTap"), "Power Tap should be unaffordable at 0 power");
assert(!DNC.Upgrades.buy(unaffordable, "powerTap"), "buy should guard unaffordable upgrades");
near(unaffordable.powerPerClick, 1, "failed buy should not change stats");

const breachState = DNC.createDefaultState();
breachState.totalPowerEarned = 320;
assert(DNC.Instability.getShardReward(breachState) === 2, "breach reward should scale from earned power");
breachState.breachCount = 4;
assert(DNC.Instability.getShardReward(breachState) === 4, "breach reward should include repeat breach bonus");

const motionState = DNC.validateState({ reducedMotion: true, instability: 82 });
assert(motionState.reducedMotion === true, "reduced motion should survive save validation");
assert(DNC.Instability.getBand(motionState.instability) === "critical", "reduced motion must not suppress critical state");

console.log("Gameplay checks passed.");
