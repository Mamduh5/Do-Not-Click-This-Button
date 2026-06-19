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
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

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
    assert(await page.locator("#arenaSkinSelect option").count() >= 6, "skin selector should render required click skins");
    assert(await page.locator("#arenaEnemySkinSelect option").count() >= 5, "enemy skin selector should render required enemy skins");
    assert(initial.activeClickSkin === "meteorImpact", "default active click skin should be Meteor Impact");
    assert(initial.activeEnemySkin === "ant", "default enemy skin should be Ant");
    await page.selectOption("#arenaSkinSelect", "pixelShatter");
    const afterUiSkinSwitch = await page.evaluate(() => window.__containmentArena.getSnapshot());
    assert(afterUiSkinSwitch.activeClickSkin === "pixelShatter", "skin selector should update active skin");
    await page.selectOption("#arenaEnemySkinSelect", "eyes");
    const afterEnemyUiSwitch = await page.evaluate(() => window.__containmentArena.getSnapshot());
    assert(afterEnemyUiSwitch.activeEnemySkin === "eyes", "enemy skin selector should update active enemy skin");

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

    for (const skinId of ["meteorImpact", "pixelShatter", "sciFiLaser", "groundBreak", "paperDrop", "arrowStrike"]) {
      const beforeSkinSnapshot = await page.evaluate(() => window.__containmentArena.getSnapshot());
      await page.evaluate((id) => {
        window.__containmentArena.setClickSkin(id);
        window.__containmentArena.clearEnemies();
        window.__containmentArena.spawnEnemyAt(300, 260, 1);
        window.__containmentArena.clickAt(300, 260);
      }, skinId);
      const skinSnapshot = await page.evaluate(() => window.__containmentArena.getSnapshot());
      assert(skinSnapshot.activeClickSkin === skinId, skinId + " should become active");
      assert(skinSnapshot.effectCounts["skin_" + skinId] > 0, skinId + " should create skin-specific effects");
      assert(skinSnapshot.effectCounts.backgroundDecals > 0, skinId + " should create background decals");
      if (skinId === "arrowStrike") {
        assert(skinSnapshot.effectCounts.arrowProjectile > (beforeSkinSnapshot.effectCounts.arrowProjectile || 0), "Arrow Strike should create a flying arrow projectile visual");
      }
    }

    await page.evaluate(() => {
      window.__containmentArena.setEnemySkin("ant");
      window.__containmentArena.clearEnemies();
      window.__containmentArena.spawnEnemyAt(160, 260, 99);
    });
    await page.waitForTimeout(350);
    const antMotionSnapshot = await page.evaluate(() => {
      const snapshot = window.__containmentArena.getSnapshot();
      const enemy = snapshot.enemySnapshots[0];
      function normalize(angle) {
        while (angle > Math.PI) {
          angle -= Math.PI * 2;
        }
        while (angle < -Math.PI) {
          angle += Math.PI * 2;
        }
        return angle;
      }
      return {
        enemy,
        orientationDelta: enemy ? Math.abs(normalize(enemy.rotation - (enemy.lastMoveAngle + enemy.forwardAngleOffset))) : null
      };
    });
    assert(antMotionSnapshot.enemy && antMotionSnapshot.enemy.skin === "ant", "ant enemy should spawn for movement orientation smoke");
    assert(antMotionSnapshot.enemy.segmentCount === 3, "ant snapshot should expose segmented ant config");
    assert(antMotionSnapshot.enemy.movingAmount > 0, "ant enemy should report movement animation state");
    assert(antMotionSnapshot.orientationDelta < 1.25, "ant enemy should rotate toward movement direction");

    for (const enemySkinId of ["ant", "eyes", "tank", "tree", "hat"]) {
      await page.evaluate((id) => {
        window.__containmentArena.setEnemySkin(id);
        window.__containmentArena.clearEnemies();
        window.__containmentArena.spawnEnemyAt(340, 260, 1);
        window.__containmentArena.clickAt(340, 260);
      }, enemySkinId);
      const enemySkinSnapshot = await page.evaluate(() => window.__containmentArena.getSnapshot());
      assert(enemySkinSnapshot.activeEnemySkin === enemySkinId, enemySkinId + " enemy skin should become active");
      assert(enemySkinSnapshot.totalDefeated > initial.totalDefeated, enemySkinId + " enemy skin should remain killable");
    }

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
      window.__containmentArena.spawnEnemyAt(520, 320, 6);
    });
    const beforeHelperTap = await page.evaluate(() => window.__containmentArena.getSnapshot());
    await page.waitForFunction((before) => window.__containmentArena.getSnapshot().effectCounts.hitImpact > before, beforeHelperTap.effectCounts.hitImpact || 0, { timeout: 4000 });
    await page.waitForTimeout(250);
    const afterHelperTap = await page.evaluate(() => window.__containmentArena.getSnapshot());
    assert(afterHelperTap.helperCursorSnapshots.some((cursor) => cursor.state === "retreat" || cursor.state === "cooldownWander"), "helper cursor should retreat or wander after a tap");
    assert(afterHelperTap.helperCursorSnapshots.every((cursor) => !(cursor.cooldownRemainingMs > 0 && cursor.targetActive && cursor.targetDistance <= afterHelperTap.stats.helperClickRadius)), "helper cursor should not stay attached to a target during cooldown");

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
    assert(afterHelperKill.backgroundDecalCount <= 42, "background decals should stay capped");

    await page.click("#arenaMuteBtn");
    await page.reload({ waitUntil: "networkidle" });
    await waitForArena(page);
    const persisted = await page.evaluate(() => window.__containmentArena.getSnapshot());
    assert(persisted.muted === true, "mute setting should persist after reload");
    assert(persisted.activeClickSkin === "arrowStrike", "active click skin should persist after reload");
    assert(persisted.activeEnemySkin === "hat", "active enemy skin should persist after reload");
    assert(consoleErrors.length === 0, "arena smoke should have no console errors: " + consoleErrors.join(" | "));
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
