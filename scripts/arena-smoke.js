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
    assert(initial.stats.projectileCount >= 1, "arena should expose at least one projectile");
    assert(await page.locator("#arenaUpgradeList .arena-upgrade-card").count() >= 5, "shop should render at least five upgrades");

    await page.waitForFunction(() => window.__containmentArena.getSnapshot().enemyCount > 0, null, { timeout: 3000 });
    const withEnemies = await page.evaluate(() => window.__containmentArena.getSnapshot());
    assert(withEnemies.enemyCount > 0, "enemies should spawn into the arena");
    await page.waitForFunction(() => {
      const snapshot = window.__containmentArena.getSnapshot();
      return snapshot.totalDefeated > 0 && snapshot.energy > 0;
    }, null, { timeout: 12000 });
    const afterAutomation = await page.evaluate(() => window.__containmentArena.getSnapshot());
    assert(afterAutomation.totalDefeated > 0, "automatic attacks should destroy enemies");
    assert(afterAutomation.energy > 0, "destroyed enemies should grant Energy");

    await page.evaluate(() => window.__containmentArena.grantEnergy(500));
    await page.locator("#arenaUpgradeList .arena-upgrade-card").first().click();
    const afterDamageUpgrade = await page.evaluate(() => window.__containmentArena.getSnapshot());
    assert(afterDamageUpgrade.upgrades.pulseCapacitor === 1, "upgrade purchase should update state");
    assert(afterDamageUpgrade.stats.attackDamage > initial.stats.attackDamage, "damage upgrade should alter attack stats");

    await page.evaluate(() => window.__containmentArena.grantEnergy(500));
    await page.locator("#arenaUpgradeList .arena-upgrade-card").nth(3).click();
    const afterProjectileUpgrade = await page.evaluate(() => window.__containmentArena.getSnapshot());
    assert(afterProjectileUpgrade.stats.projectileCount > initial.stats.projectileCount, "split upgrade should add visible projectile capacity");

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
