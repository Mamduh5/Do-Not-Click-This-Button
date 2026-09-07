"use strict";
const { mkdirSync } = require("node:fs");

function assert(condition, message) { if (!condition) { throw new Error(message); } }

module.exports = async function checkOperations(page) {
  await page.evaluate(() => {
    const scene = window.__containmentArena.scene;
    scene.resetPrototype();
    scene.state.muted = true;
    scene.soundSystem.setMuted(true);
    scene.spawningEnabled = true;
  });
  // Play the finite quota through the actual spawner and attack path.
  for (let kill = 0; kill < 8; kill += 1) {
    await page.waitForFunction(() => window.__containmentArena.scene.enemies.some(e => e.active));
    await page.evaluate(() => {
      const scene = window.__containmentArena.scene;
      const enemy = scene.enemies.find(e => e.active);
      for (let hit = 0; hit < 20 && enemy.active; hit += 1) {
        window.__containmentArena.clickAt(enemy.x, enemy.y);
      }
    });
  }
  let snapshot = await page.evaluate(() => window.__containmentArena.getSnapshot());
  assert(snapshot.wave === 1 && snapshot.wavePhase === "cleared" && snapshot.waveKills === 8, "real wave clears its finite quota");
  assert(snapshot.pulseCharge === 100, "eight manual kills charge pulse");
  await page.locator("#arenaOperationOverlay").waitFor({ state: "visible" });
  assert(await page.locator("#arenaOperationOverlay").isVisible(), "clear screen appears after the victory beat");
  const rewardEnergy = snapshot.energy;
  await page.waitForTimeout(1200);
  snapshot = await page.evaluate(() => window.__containmentArena.getSnapshot());
  assert(snapshot.enemyCount === 0 && snapshot.energy === rewardEnergy && snapshot.wave === 1, "upgrade break does not spawn or reward again");
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(() => Boolean(window.__containmentArena));
  snapshot = await page.evaluate(() => window.__containmentArena.getSnapshot());
  assert(snapshot.wavePhase === "cleared" && snapshot.energy === rewardEnergy, "reload preserves paid break");
  await page.locator(".arena-upgrade-card").filter({ has: page.locator(".upgrade-name", { hasText: "Heavier Cursor" }) }).click();
  snapshot = await page.evaluate(() => window.__containmentArena.getSnapshot());
  assert(snapshot.stats.clickDamage > 2 && snapshot.energy < rewardEnergy, "reward buys a meaningful upgrade");
  await page.locator("#arenaNextWaveBtn").click();
  await page.waitForFunction(() => window.__containmentArena.getSnapshot().enemyCount > 0);
  assert((await page.evaluate(() => window.__containmentArena.getSnapshot())).wave === 2, "release starts wave two");
  await page.locator("#arenaPauseBtn").click();
  const paused = await page.evaluate(() => window.__containmentArena.getSnapshot());
  await page.waitForTimeout(250);
  snapshot = await page.evaluate(() => window.__containmentArena.getSnapshot());
  assert(snapshot.paused && snapshot.enemySnapshots[0].x === paused.enemySnapshots[0].x &&
    snapshot.enemySnapshots[0].y === paused.enemySnapshots[0].y, "pause freezes movement");
  assert(await page.locator("#arenaPulseBtn").isDisabled(), "pause blocks pulse");
  await page.keyboard.press("p");
  assert(!(await page.evaluate(() => window.__containmentArena.getSnapshot())).paused, "P resumes even when the pause button has focus");
  await page.evaluate(() => {
    const scene = window.__containmentArena.scene;
    scene.spawningEnabled = false;
    window.__containmentArena.clearEnemies();
    window.__containmentArena.spawnEnemyAt(480, 310, 1);
  });
  await page.locator("#arenaPulseBtn").click();
  snapshot = await page.evaluate(() => window.__containmentArena.getSnapshot());
  assert(snapshot.pulseCharge === 0 && snapshot.enemySnapshots.length === 0, "charged pulse kills center target without recharging itself");
  // Seed a fifth-wave finale through valid persisted state; existing skin stays cosmetic.
  await page.evaluate(() => {
    const scene = window.__containmentArena.scene;
    scene.state.wave = 5;
    scene.state.waveKills = ARENA.Waves.getDefinition(5).target - 1;
    scene.state.wavePhase = "active";
    ARENA.Save.save(scene.state);
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__containmentArena && window.__containmentArena.getSnapshot().enemySnapshots.some(e => e.role === "champion"));
  snapshot = await page.evaluate(() => window.__containmentArena.getSnapshot());
  assert(snapshot.enemySnapshots.length === 1 && snapshot.enemySnapshots[0].skin === "ant", "champion finale retains selected cosmetic skin");
  await page.evaluate(() => {
    const scene = window.__containmentArena.scene;
    const enemy = scene.enemies.find(e => e.active);
    for (let hit = 0; hit < 100 && enemy.active; hit += 1) { window.__containmentArena.clickAt(enemy.x, enemy.y); }
  });
  assert((await page.evaluate(() => window.__containmentArena.getSnapshot())).wavePhase === "cleared", "champion kill clears fifth wave");
  // Bound display-list lifetime after effects complete.
  await page.evaluate(() => {
    const scene = window.__containmentArena.scene;
    scene.resetPrototype();
    scene.spawningEnabled = false;
    window.__containmentArena.clearEnemies();
  });
  await page.waitForTimeout(3000);
  const baseline = await page.evaluate(() => window.__containmentArena.scene.children.list.length);
  await page.evaluate(() => {
    const scene = window.__containmentArena.scene;
    ["meteorImpact", "groundBreak", "paperDrop", "pixelShatter"].forEach(id => {
      scene.setClickSkin(id);
      for (let i = 0; i < 4; i += 1) {
        window.__containmentArena.clickAt(200 + i * 80, 250);
        ARENA.ImpactEffects.showHitParticles(scene, 250, 250, 1, 0x111111);
        ARENA.ImpactEffects.showSplatter(scene, 250, 250, 1, 0x111111);
      }
    });
  });
  await page.waitForFunction(() => {
    const scene = window.__containmentArena.scene;
    return scene.destructibleBackgroundSystem.activeDamageMarks.length === 0 &&
      scene.destructibleBackgroundSystem.activeTemporaryChunks.length === 0 && scene.tweens.getTweens().length === 0;
  }, null, { timeout: 10000 });
  const remaining = await page.evaluate(() => {
    const scene = window.__containmentArena.scene;
    return scene.children.list.length - scene.backgroundEffectSystem.decals.length;
  });
  assert(remaining <= baseline, "particles and terrain effects release their display objects");
  assert((await page.locator(".arena-upgrade-card").filter({ hasText: "Splatter Yield" }).locator(".upgrade-preview").textContent()).includes("1.18x"), "upgrade previews preserve fractional gains");
  // Show a representative active encounter in the responsive captures.
  await page.evaluate(() => {
    const scene = window.__containmentArena.scene;
    scene.state.wave = 5;
    scene.state.waveKills = 0;
    scene.waveSystem = ARENA.Waves.create(scene.state);
    ["standard", "runner", "brute", "champion"].forEach((role, index) => {
      scene.enemies.push(ARENA.Enemies.create(scene, 180 + index * 190, 300, 5, undefined, role));
    });
    scene.refreshUi();
  });
  await page.waitForTimeout(300);
  mkdirSync("output/playwright", { recursive: true });
  for (const [name, viewport] of [
    ["desktop", { width: 1440, height: 900 }],
    ["tablet", { width: 820, height: 1180 }],
    ["mobile", { width: 390, height: 844 }]
  ]) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(250);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), name + " arena has no horizontal overflow");
    await page.screenshot({ path: "output/playwright/operations-" + name + ".png", fullPage: true });
  }
  console.log("Arena operation browser checks passed.");
};
