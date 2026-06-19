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

    const initial = await page.evaluate(() => window.__containmentArena.getSnapshot());
    assert(initial.wave === 1, "arena should start at wave 1");
    assert(initial.stats.clickRadius > 0, "arena should expose cursor click radius");
    assert(initial.stats.clickDamage > 0, "arena should expose cursor click damage");
    assert(await page.locator("#arenaUpgradeList .arena-upgrade-card").count() >= 5, "shop should render at least five upgrades");

    await page.waitForFunction(() => window.__containmentArena.getSnapshot().enemyCount > 0, null, { timeout: 3000 });
    const withEnemies = await page.evaluate(() => window.__containmentArena.getSnapshot());
    assert(withEnemies.enemyCount > 0, "enemies should spawn into the arena");
    await page.evaluate(() => {
      window.__containmentArena.spawnEnemyAt(320, 260, 1);
      window.__containmentArena.clickAt(320, 260);
    });
    const afterClickKill = await page.evaluate(() => window.__containmentArena.getSnapshot());
    assert(afterClickKill.totalDefeated > initial.totalDefeated, "cursor click should kill a weak enemy");
    assert(afterClickKill.energy > initial.energy, "cursor kill should grant Energy");

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
    await page.locator("#arenaUpgradeList .arena-upgrade-card").nth(5).click();
    await page.waitForFunction(() => window.__containmentArena.getSnapshot().helperCursorCount > 0, null, { timeout: 3000 });
    const afterHelperUpgrade = await page.evaluate(() => window.__containmentArena.getSnapshot());
    assert(afterHelperUpgrade.helperCursorCount > 0, "auto tapper should create visible helper cursors");

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
