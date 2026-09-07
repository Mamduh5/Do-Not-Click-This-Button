"use strict";

const { chromium } = require("@playwright/test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const output = __dirname;
const url = "http://127.0.0.1:5180/";
const report = { startedAt: new Date().toISOString(), viewports: [], errors: [] };

async function snapshot(page) {
  return page.evaluate(() => {
    const ids = ["powerDisplay", "perClickDisplay", "guideTitle", "guideText", "guideAction", "stateBadge", "shardsDisplay", "breachesDisplay"];
    const values = Object.fromEntries(ids.map(id => [id, document.getElementById(id).textContent.trim()]));
    const guide = document.getElementById("guideAction");
    const rect = guide.getBoundingClientRect();
    values.guideReady = guide.classList.contains("upgrade-ready");
    values.guideBounds = { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    values.horizontalOverflow = document.documentElement.scrollWidth > innerWidth;
    values.save = JSON.parse(localStorage.getItem("doNotClickThisButtonSave") || "null");
    return values;
  });
}

async function capture(page, name, fullPage = true) {
  const filename = `polish-button-${name}.png`;
  await page.screenshot({ path: path.join(output, filename), fullPage });
  return filename;
}

(async () => {
  const browser = await chromium.launch();
  try {
    for (const viewport of [
      { name: "desktop", width: 1440, height: 900 },
      { name: "tablet", width: 820, height: 1180 },
      { name: "mobile", width: 390, height: 844 }
    ]) {
      const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
      const page = await context.newPage();
      page.on("pageerror", error => report.errors.push(`${viewport.name}: ${error.message}`));
      await page.goto(url, { waitUntil: "networkidle" });
      await page.locator("#mainBtn").waitFor();
      const result = { viewport, screenshots: [], initial: await snapshot(page) };
      assert.equal(result.initial.powerDisplay, "0");
      assert.equal(result.initial.perClickDisplay, "1");
      assert.equal(result.initial.save, null, "context must start with a clean save");
      result.screenshots.push(await capture(page, `${viewport.name}-first-contact`));

      await page.locator("#mainBtn").click();
      result.firstClick = await snapshot(page);
      assert.equal(result.firstClick.powerDisplay, "1");
      assert.equal(result.firstClick.guideAction, "VIEW POWER UPGRADES");
      assert.equal(result.firstClick.guideReady, false);
      await page.locator("#guideAction").click();
      assert.equal(await page.locator("#card-powerTap").isDisabled(), true);
      for (let click = 1; click < 8; click += 1) {
        await page.locator("#mainBtn").click();
        await page.waitForTimeout(130);
      }
      result.ready = await snapshot(page);
      assert.equal(result.ready.powerDisplay, "8");
      assert.equal(result.ready.guideAction, "INSTALL POWER TAP / 8 POWER");
      assert.equal(result.ready.guideReady, true);
      assert.equal(result.ready.horizontalOverflow, false);
      result.screenshots.push(await capture(page, `${viewport.name}-upgrade-ready`));

      await page.locator("#guideAction").click();
      result.purchased = await snapshot(page);
      assert.equal(result.purchased.powerDisplay, "0");
      assert.equal(result.purchased.perClickDisplay, "2");
      assert.equal(result.purchased.guideAction, "VIEW AUTOMATION");
      assert.equal(result.purchased.save.upgrades.powerTap, 1);
      await page.reload({ waitUntil: "networkidle" });
      result.reloaded = await snapshot(page);
      assert.equal(result.reloaded.powerDisplay, "0");
      assert.equal(result.reloaded.perClickDisplay, "2");
      await page.locator("#mainBtn").click();
      result.nextClick = await snapshot(page);
      assert.equal(result.nextClick.powerDisplay, "2");
      result.screenshots.push(await capture(page, `${viewport.name}-purchased`));
      report.viewports.push(result);
      console.log(`${viewport.name}: 8 real clicks -> guide purchase -> 0 Power persists on reload -> next click gives 2 Power`);

      if (viewport.name === "desktop") {
        // Earn the permanent upgrade through normal play, without save or state injection.
        // One Power Tap yields only one Shard; earn a second level to fund the two-Shard upgrade.
        for (let click = 0; click < 6; click += 1) {
          await page.locator("#mainBtn").click();
          await page.waitForTimeout(130);
        }
        await page.locator("#card-powerTap").click();
        assert.equal((await snapshot(page)).perClickDisplay, "3");
        const clickRect = await page.locator("#mainBtn").boundingBox();
        let clicksToBreach = 0;
        while (!(await page.locator("#breachOverlay").isVisible()) && clicksToBreach < 170) {
          await page.mouse.click(clickRect.x + clickRect.width / 2, clickRect.y + clickRect.height / 2);
          clicksToBreach += 1;
          await page.waitForTimeout(100);
        }
        assert.equal(await page.locator("#breachOverlay").isVisible(), true);
        const breach = { clicksToBreach, state: await snapshot(page), screenshot: await capture(page, "desktop-breach") };
        await page.locator("#breachContinueBtn").click();
        const permanentGuide = await snapshot(page);
        assert.equal(permanentGuide.guideAction, "SPEND SHARDS");
        assert.equal(await page.locator("#shard-card-residualCharge").isEnabled(), true);
        await page.locator("#shard-card-residualCharge").click();
        await page.locator("#menuBtn").click();
        await page.locator("#resetRunBtn").click();
        await page.locator("#menuConfirmBtn").click();
        const granted = await snapshot(page);
        assert.equal(granted.powerDisplay, "10");
        await page.locator("#card-powerTap").click();
        const spent = await snapshot(page);
        assert.equal(spent.powerDisplay, "2");
        await page.reload({ waitUntil: "networkidle" });
        const restored = await snapshot(page);
        assert.equal(restored.powerDisplay, "2", "spent starting Power must not be restored on reload");
        assert.equal(restored.save.shardUpgrades.residualCharge, 1);
        assert.equal(restored.save.upgrades.powerTap, 1);
        report.startingPowerReload = { breach, permanentGuide, granted, spent, restored, screenshot: await capture(page, "desktop-spent-starting-power-reload") };
        console.log("Residual Charge earned through breach, bought via UI, 10 starting Power spent to 2, reload preserves 2.");
      }
      await context.close();
    }
    assert.deepEqual(report.errors, []);
    report.passed = true;
  } catch (error) {
    report.passed = false;
    report.failure = error.stack;
    throw error;
  } finally {
    report.finishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(output, "polish-button-report.json"), JSON.stringify(report, null, 2));
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
