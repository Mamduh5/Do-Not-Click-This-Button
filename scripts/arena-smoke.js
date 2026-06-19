"use strict";

const { chromium } = require("@playwright/test");

const url = process.argv[2] || process.env.ARENA_SMOKE_URL || "http://127.0.0.1:5180/arena.html";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function waitForArena(page) {
  await page.waitForFunction(() => Boolean(window.__containmentArena && window.__containmentArena.getSnapshot));
}

async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 820 } });

  try {
    await page.goto(url, { waitUntil: "networkidle" });
    await waitForArena(page);
    await page.waitForSelector("#arenaMount canvas");
    await page.evaluate(() => {
      localStorage.removeItem("containmentSwarmSave");
      document.getElementById("arenaResetBtn").click();
      window.__containmentArena.setSpawning(false);
      window.__containmentArena.clearEnemies();
    });

    const initial = await page.evaluate(() => window.__containmentArena.getSnapshot());
    assert(initial.wave === 1, "arena should start at wave 1");
    assert(initial.stats.clickRadius > 0, "arena should expose cursor click radius");
    assert(initial.stats.clickDamage > 0, "arena should expose cursor click damage");
    assert(await page.locator("#arenaUpgradeList .arena-upgrade-card").count() >= 5, "shop should render at least five upgrades");

    const missResult = await page.evaluate(() => window.__containmentArena.clickAt(40, 40));
    const afterMiss = await page.evaluate(() => window.__containmentArena.getSnapshot());
    assert(missResult.hit === false, "empty click should be a miss");
    assert(afterMiss.energy === initial.energy, "miss click should not grant Energy");
    assert(afterMiss.effectCounts.missImpact > 0, "miss click should create miss feedback");

    await page.evaluate(() => {
      window.__containmentArena.spawnEnemyAt(320, 260, 1);
      window.__containmentArena.clickAt(320, 260);
    });
    const afterClickKill = await page.evaluate(() => window.__containmentArena.getSnapshot());
    assert(afterClickKill.totalDefeated > initial.totalDefeated, "cursor click should kill a weak enemy");
    assert(afterClickKill.energy > initial.energy, "cursor kill should grant Energy");
    assert(afterClickKill.effectCounts.hitImpact > 0, "click kill should create hit impact feedback");
    assert(afterClickKill.effectCounts.killBurst > 0, "click kill should create kill burst feedback");
    assert(afterClickKill.effectCounts.splatter > 0, "click kill should create splatter feedback");

    await page.evaluate(() => window.__containmentArena.grantEnergy(500));
    await page.locator("#arenaUpgradeList .arena-upgrade-card").first().click();
    const afterDamageUpgrade = await page.evaluate(() => window.__containmentArena.getSnapshot());
    assert(afterDamageUpgrade.upgrades.heavierCursor === 1, "click damage upgrade purchase should update state");
    assert(afterDamageUpgrade.stats.clickDamage > initial.stats.clickDamage, "damage upgrade should alter click stats");

    await page.evaluate(() => window.__containmentArena.grantEnergy(500));
    await page.locator("#arenaUpgradeList .arena-upgrade-card").nth(1).click();
    const afterRadiusUpgrade = await page.evaluate(() => window.__containmentArena.getSnapshot());
    assert(afterRadiusUpgrade.stats.clickRadius > initial.stats.clickRadius, "radius upgrade should increase click radius");

    await page.evaluate(() => window.__containmentArena.grantEnergy(500));
    await page.locator("#arenaUpgradeList .arena-upgrade-card").nth(4).click();
    await page.evaluate(() => {
      window.__containmentArena.clearEnemies();
      window.__containmentArena.spawnEnemyAt(360, 280, 1);
      window.__containmentArena.spawnEnemyAt(376, 280, 1);
      window.__containmentArena.clickAt(360, 280);
    });
    const afterShockClick = await page.evaluate(() => window.__containmentArena.getSnapshot());
    assert(afterShockClick.effectCounts.shockwave > 0, "shock click should create a shockwave effect");
    assert(afterShockClick.totalDefeated >= afterRadiusUpgrade.totalDefeated + 2, "shock click should damage nearby enemies");

    await page.evaluate(() => window.__containmentArena.grantEnergy(500));
    await page.locator("#arenaUpgradeList .arena-upgrade-card").nth(5).click();
    await page.waitForFunction(() => window.__containmentArena.getSnapshot().helperCursorCount > 0, null, { timeout: 3000 });
    const afterHelperUpgrade = await page.evaluate(() => window.__containmentArena.getSnapshot());
    assert(afterHelperUpgrade.helperCursorCount > 0, "auto tapper should create visible helper cursors");
    await page.evaluate(() => {
      window.__containmentArena.clearEnemies();
      window.__containmentArena.spawnEnemyAt(520, 320, 1);
    });
    const beforeHelperKill = await page.evaluate(() => window.__containmentArena.getSnapshot());
    await page.waitForFunction((before) => window.__containmentArena.getSnapshot().totalDefeated === before + 1, beforeHelperKill.totalDefeated, { timeout: 4000 });
    await page.waitForTimeout(300);
    const afterHelperKill = await page.evaluate(() => window.__containmentArena.getSnapshot());
    assert(afterHelperKill.totalDefeated === beforeHelperKill.totalDefeated + 1, "helper cursor should not double-award a single enemy");
    assert(afterHelperKill.effectCounts.hitImpact > afterHelperUpgrade.effectCounts.hitImpact, "helper cursor should create click feedback");

    await page.click("#arenaMuteBtn");
    await page.reload({ waitUntil: "networkidle" });
    await waitForArena(page);
    const muted = await page.evaluate(() => window.__containmentArena.getSnapshot().muted);
    assert(muted === true, "mute setting should persist after reload");
  } finally {
    await browser.close();
  }
}

run()
  .then(() => {
    console.log("Arena browser smoke checks passed.");
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
