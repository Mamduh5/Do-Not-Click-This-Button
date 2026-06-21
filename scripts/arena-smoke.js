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
    assert(initial.destructibleBackground.enabled === true, "destructible background should be enabled");
    assert(typeof initial.destructibleBackground.renderTextureUsed === "boolean", "destructible background should expose render texture mode");
    assert(initial.destructibleBackground.backgroundMaterial.id === "containmentFloor", "destructible background should expose active material");
    assert(initial.activeBackgroundSkin === "containmentFloor", "arena should expose default active background material");
    assert(await page.locator("#arenaUpgradeList .arena-upgrade-card").count() >= 5, "shop should render at least five upgrades");
    assert(await page.locator("#arenaSkinSelect option").count() >= 6, "skin selector should render required click skins");
    assert(await page.locator("#arenaEnemySkinSelect option").count() >= 5, "enemy skin selector should render required enemy skins");
    assert(await page.locator("#arenaBackgroundSkinSelect option").count() >= 4, "background selector should render required background skins");
    const clickSkinOptions = await page.locator("#arenaSkinSelect option").evaluateAll((options) => options.map((option) => option.textContent.trim()));
    const enemySkinOptions = await page.locator("#arenaEnemySkinSelect option").evaluateAll((options) => options.map((option) => option.textContent.trim()));
    const backgroundSkinOptions = await page.locator("#arenaBackgroundSkinSelect option").evaluateAll((options) => options.map((option) => option.textContent.trim()));
    assert(clickSkinOptions.includes("Arrow Rain"), "click skin selector should show Arrow Rain");
    assert(enemySkinOptions.includes("Worm"), "enemy skin selector should show Worm");
    assert(!enemySkinOptions.includes("Tree"), "enemy skin selector should not show removed Tree skin");
    assert(backgroundSkinOptions.includes("Sand"), "background selector should show Sand");
    assert(backgroundSkinOptions.includes("Water"), "background selector should show Water");
    assert(backgroundSkinOptions.includes("Town"), "background selector should show Town");
    assert(initial.activeClickSkin === "meteorImpact", "default active click skin should be Meteor Impact");
    assert(initial.activeEnemySkin === "ant", "default enemy skin should be Ant");
    await page.selectOption("#arenaSkinSelect", "pixelShatter");
    const afterUiSkinSwitch = await page.evaluate(() => window.__containmentArena.getSnapshot());
    assert(afterUiSkinSwitch.activeClickSkin === "pixelShatter", "skin selector should update active skin");
    await page.selectOption("#arenaEnemySkinSelect", "eyes");
    const afterEnemyUiSwitch = await page.evaluate(() => window.__containmentArena.getSnapshot());
    assert(afterEnemyUiSwitch.activeEnemySkin === "eyes", "enemy skin selector should update active enemy skin");
    await page.selectOption("#arenaBackgroundSkinSelect", "water");
    const afterWaterSwitch = await page.evaluate(() => window.__containmentArena.getSnapshot());
    assert(afterWaterSwitch.activeBackgroundSkin === "water", "background selector should update active background skin");
    assert(afterWaterSwitch.destructibleBackground.backgroundMaterial.id === "water", "background switch should rebuild material");
    assert(afterWaterSwitch.destructibleBackground.waterAnimation && afterWaterSwitch.destructibleBackground.waterAnimation.enabled === true, "Water should expose animation debug snapshot");
    assert(afterWaterSwitch.destructibleBackground.waterAnimation.active === true, "Water animation snapshot should be active");
    assert(afterWaterSwitch.destructibleBackground.waterAnimation.waveCount > 0, "Water animation snapshot should expose wave count");
    assert(afterWaterSwitch.destructibleBackground.waterAnimation.shimmerCount > 0, "Water animation snapshot should expose shimmer count");
    const beforeWaterBreak = await page.evaluate(() => window.__containmentArena.getSnapshot());
    await page.evaluate(() => {
      window.__containmentArena.setClickSkin("groundBreak");
      window.__containmentArena.clearEnemies();
      window.__containmentArena.clickAt(150, 150);
    });
    const afterWaterBreak = await page.evaluate(() => window.__containmentArena.getSnapshot());
    assert(afterWaterBreak.destructibleBackground.lastGroundBreakBrush.damageType === "waterRipple", "Ground Break on Water should use ripple response");
    assert(afterWaterBreak.destructibleBackground.lastGroundBreakBrush.type === "waterRipple", "Ground Break on Water should expose ripple brush");
    assert(afterWaterBreak.destructibleBackground.waterAnimation.rippleCount > 0, "Ground Break on Water should expose active ripple debug count");
    assert((afterWaterBreak.effectCounts.backgroundDamage_localizedCollapse || 0) === (beforeWaterBreak.effectCounts.backgroundDamage_localizedCollapse || 0), "Ground Break on Water should not create crack collapse response");
    assert(afterWaterBreak.effectCounts.backgroundWaterRipple > (beforeWaterBreak.effectCounts.backgroundWaterRipple || 0), "Ground Break on Water should create ripple/splash debug event");
    await page.selectOption("#arenaBackgroundSkinSelect", "town");
    const afterTownSwitch = await page.evaluate(() => window.__containmentArena.getSnapshot());
    assert(afterTownSwitch.activeBackgroundSkin === "town", "background selector should switch to Town");
    assert(afterTownSwitch.obstacles.enabled === true && afterTownSwitch.obstacles.obstacleCount > 0, "Town should expose obstacles");
    assert(afterTownSwitch.obstacles.debugOverlay === true, "Town obstacle debug snapshot should exist");
    assert(afterTownSwitch.townMap && afterTownSwitch.townMap.roadCount > 0, "Town should expose road debug snapshot");
    assert(afterTownSwitch.townMap.buildingCount === afterTownSwitch.obstacles.obstacleCount, "Town should expose matching building/obstacle counts");
    await page.evaluate(() => {
      const obstacle = window.__containmentArena.getSnapshot().obstacles.obstacles[0];
      window.__containmentArena.clearEnemies();
      window.__containmentArena.spawnEnemyAt(obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height / 2, 99);
    });
    await page.waitForTimeout(180);
    const afterTownSpawn = await page.evaluate(() => window.__containmentArena.getSnapshot());
    assert(afterTownSpawn.enemiesInsideObstacles === 0, "Enemies should not spawn or remain inside Town obstacles");
    assert(afterTownSpawn.townMap.enemiesInsideObstacles === 0, "Town map debug should report no enemy obstacle overlap");
    assert(typeof afterTownSpawn.townMap.stuckEnemyCount === "number", "Town map debug should expose stuck enemy count");
    await page.selectOption("#arenaBackgroundSkinSelect", "containmentFloor");
    const afterContainmentSwitch = await page.evaluate(() => window.__containmentArena.getSnapshot());
    assert(afterContainmentSwitch.activeBackgroundSkin === "containmentFloor", "background selector should switch back to Containment Floor");

    for (const skinId of ["meteorImpact", "pixelShatter", "sciFiLaser", "groundBreak", "paperDrop", "arrowStrike"]) {
      const beforeEmptySkin = await page.evaluate(() => window.__containmentArena.getSnapshot());
      const missResult = await page.evaluate((id) => {
        window.__containmentArena.setClickSkin(id);
        window.__containmentArena.clearEnemies();
        return window.__containmentArena.clickAt(58, 58);
      }, skinId);
      const afterEmptySkin = await page.evaluate(() => window.__containmentArena.getSnapshot());
      assert(missResult.hit === false, skinId + " empty click should be a miss");
      assert(afterEmptySkin.energy === beforeEmptySkin.energy, skinId + " empty click should not grant Energy");
      assert(afterEmptySkin.effectCounts.missImpact > (beforeEmptySkin.effectCounts.missImpact || 0), skinId + " empty click should create miss feedback");
      assert(afterEmptySkin.effectCounts["skin_" + skinId] > (beforeEmptySkin.effectCounts["skin_" + skinId] || 0), skinId + " empty click should create active skin effect");
      if (skinId !== "pixelShatter" && skinId !== "groundBreak") {
        assert(afterEmptySkin.effectCounts.backgroundDecals > (beforeEmptySkin.effectCounts.backgroundDecals || 0), skinId + " empty click should create a background decal");
      }
      if (skinId === "pixelShatter") {
        assert(afterEmptySkin.effectCounts.pixelBreak > (beforeEmptySkin.effectCounts.pixelBreak || 0), "Pixel Shatter empty click should create pixel break effect");
        assert(afterEmptySkin.effectCounts.backgroundDamage_localGridBreak > (beforeEmptySkin.effectCounts.backgroundDamage_localGridBreak || 0), "Pixel Shatter empty click should damage local cell grid in the background layer");
        assert(afterEmptySkin.effectCounts.backgroundDamageResponse_pixelShatter > (beforeEmptySkin.effectCounts.backgroundDamageResponse_pixelShatter || 0), "Pixel Shatter should use material response");
        assert(afterEmptySkin.destructibleBackground.lastPixelShatterBrush.type === "localGridBreak", "Pixel Shatter should expose local-grid brush debug info");
        assert(afterEmptySkin.destructibleBackground.lastPixelShatterBrush.cellCount > 0, "Pixel Shatter local-grid brush should remove cells");
        assert(afterEmptySkin.lastPixelShatterEffect.type === "localGridBreak", "Pixel Shatter foreground should be local grid break");
        assert(afterEmptySkin.lastPixelShatterEffect.hasSweepingScanline === false, "Pixel Shatter foreground should not use sweeping scanline");
        assert(afterEmptySkin.destructibleBackground.damageCount > beforeEmptySkin.destructibleBackground.damageCount, "Pixel Shatter empty click should increment destructible damage count");
        await page.waitForFunction((before) => window.__containmentArena.getSnapshot().destructibleBackground.repairCount > before, beforeEmptySkin.destructibleBackground.repairCount, { timeout: 2600 });
      }
      if (skinId === "groundBreak") {
        assert(afterEmptySkin.effectCounts.groundFracture > (beforeEmptySkin.effectCounts.groundFracture || 0), "Ground Break empty click should fracture the background");
        assert(afterEmptySkin.effectCounts.backgroundDamage_localizedCollapse > (beforeEmptySkin.effectCounts.backgroundDamage_localizedCollapse || 0), "Ground Break empty click should damage localized collapse in the background layer");
        assert(afterEmptySkin.effectCounts.backgroundDamageResponse_groundBreak > (beforeEmptySkin.effectCounts.backgroundDamageResponse_groundBreak || 0), "Ground Break should use material response");
        assert(afterEmptySkin.destructibleBackground.lastGroundBreakBrush.type === "localizedCollapse", "Ground Break should expose localized-collapse brush debug info");
        assert(afterEmptySkin.destructibleBackground.lastGroundBreakBrush.lineCount > 0, "Ground Break collapse brush should create short crack lines");
        assert(afterEmptySkin.lastGroundBreakEffect.type === "localizedCollapse", "Ground Break foreground should be localized collapse");
        assert(afterEmptySkin.lastGroundBreakEffect.chunkCount >= 4 && afterEmptySkin.lastGroundBreakEffect.shortCrackCount <= 8, "Ground Break foreground should use compact chunks and short cracks");
        assert(afterEmptySkin.destructibleBackground.damageCount > beforeEmptySkin.destructibleBackground.damageCount, "Ground Break empty click should increment destructible damage count");
        await page.waitForFunction((before) => window.__containmentArena.getSnapshot().destructibleBackground.repairCount > before, beforeEmptySkin.destructibleBackground.repairCount, { timeout: 2600 });
      }
      if (skinId === "arrowStrike") {
        assert(afterEmptySkin.effectCounts.arrowRain > (beforeEmptySkin.effectCounts.arrowRain || 0), "Arrow Rain empty click should create arrow rain effect");
        assert(afterEmptySkin.effectCounts.backgroundArrows > (beforeEmptySkin.effectCounts.backgroundArrows || 0), "Arrow Rain empty click should create arrow background marks");
      }
    }

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
      if (skinId === "pixelShatter" || skinId === "groundBreak") {
        assert(skinSnapshot.destructibleBackground.damageCount > beforeSkinSnapshot.destructibleBackground.damageCount, skinId + " should damage the destructible background on enemy click");
      } else {
        assert(skinSnapshot.effectCounts.backgroundDecals > 0, skinId + " should create background decals");
      }
      if (skinId === "arrowStrike") {
        assert(skinSnapshot.effectCounts.arrowRain > (beforeSkinSnapshot.effectCounts.arrowRain || 0), "Arrow Rain should create multi-arrow visual");
        await page.waitForFunction((before) => window.__containmentArena.getSnapshot().effectCounts.arrowRainArrow >= before + 3, beforeSkinSnapshot.effectCounts.arrowRainArrow || 0, { timeout: 1500 });
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

    for (const enemySkinId of ["ant", "eyes", "tank", "hat", "worm"]) {
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
    await page.evaluate(() => {
      window.__containmentArena.setEnemySkin("hat");
    });

    await page.evaluate(() => {
      window.__containmentArena.clearEnemies();
      window.__containmentArena.spawnEnemyAt(460, 260, 1);
      window.__containmentArena.spawnEnemyAt(490, 260, 1);
      window.__containmentArena.clickAt(460, 260);
      window.__containmentArena.clickAt(490, 260);
    });
    const comboSnapshot = await page.evaluate(() => window.__containmentArena.getSnapshot());
    assert(comboSnapshot.combo >= 2, "rapid kills should build combo");
    assert(comboSnapshot.effectCounts.comboPopup > 0, "combo popup should appear after rapid kills");

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
    await page.selectOption("#arenaBackgroundSkinSelect", "town");
    await page.reload({ waitUntil: "networkidle" });
    await waitForArena(page);
    const persisted = await page.evaluate(() => window.__containmentArena.getSnapshot());
    assert(persisted.muted === true, "mute setting should persist after reload");
    assert(persisted.activeClickSkin === "arrowStrike", "active click skin should persist after reload");
    assert(persisted.activeEnemySkin === "hat", "active enemy skin should persist after reload");
    assert(persisted.activeBackgroundSkin === "town", "active background skin should persist after reload");
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
