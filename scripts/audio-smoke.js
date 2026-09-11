"use strict";
const { chromium } = require("@playwright/test");
const assert = require("node:assert/strict");
const { mkdirSync, writeFileSync } = require("node:fs");
const base = process.env.SFX_SMOKE_URL || "http://127.0.0.1:5173";
const output = "output/playwright/audio";
mkdirSync(output, { recursive: true });
const report = { physicalPhone: "Not available; browser emulation and filtered audio are not phone-speaker listening." };
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

async function soundCount(page, name) {
  return page.evaluate(n => ContainmentSfx.snapshot().played?.[n] || 0, name);
}
async function fiveFingers(page, selector, rounds) {
  const client = await page.context().newCDPSession(page);
  const target = page.locator(selector); await target.scrollIntoViewIfNeeded();
  const box = await target.boundingBox();
  const points = [[-12, -12], [12, -12], [0, 0], [-12, 12], [12, 12]].map(([x, y], id) => ({
    id: id + 1, x: box.x + box.width / 2 + x, y: box.y + box.height / 2 + y
  }));
  for (let i = 0; i < rounds; i++) {
    await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: points });
    await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await pause(28);
  }
  await client.detach();
}
async function seedBreach(page, values) {
  await page.goto(base + "/index.html");
  await page.evaluate(v => localStorage.setItem("doNotClickThisButtonSave", JSON.stringify({
    version: 1, power: 300, runPowerEarned: 600, totalPowerEarned: 600, instability: 0, ...v
  })), values);
  await page.goto(base + "/breach.html"); await page.waitForFunction(() => document.querySelector("#stabilizeBtn"));
}
async function renderAudio(page) {
  return page.evaluate(async () => {
    const rate = 24000;
    async function render(events, seconds, volume = 0.75, phone = false, old = false) {
      const ctx = new OfflineAudioContext(4, seconds * rate, rate);
      const merger = ctx.createChannelMerger(4); merger.connect(ctx.destination);
      const main = ctx.createGain(); main.connect(merger, 0, 0);
      let destination = main;
      if (phone) {
        const hp = ctx.createBiquadFilter(), lp = ctx.createBiquadFilter();
        hp.type = "highpass"; hp.frequency.value = 300; lp.type = "lowpass"; lp.frequency.value = 4000;
        hp.connect(lp); lp.connect(destination); destination = hp;
      }
      const monitors = {};
      ["spam", "info", "critical"].forEach((group, i) => {
        const hp = ctx.createBiquadFilter(), lp = ctx.createBiquadFilter();
        hp.type = "highpass"; hp.frequency.value = 300; lp.type = "lowpass"; lp.frequency.value = 4000;
        hp.connect(lp); lp.connect(merger, 0, i + 1); monitors[group] = hp;
      });
      const mixer = ContainmentSfx.createEngine(ctx, destination, monitors); mixer.setSettings({ muted: false, volume });
      for (const event of events) {
        if (old) {
          const osc = ctx.createOscillator(), gain = ctx.createGain();
          osc.type = "sawtooth"; osc.frequency.setValueAtTime(150, event.at);
          osc.frequency.exponentialRampToValueAtTime(70, event.at + 0.055);
          gain.gain.setValueAtTime(0.22 * 0.13, event.at); gain.gain.exponentialRampToValueAtTime(0.001, event.at + 0.055);
          osc.connect(gain); gain.connect(destination); osc.start(event.at); osc.stop(event.at + 0.055);
        } else if (event.stop) { mixer.stop(event.stop, event.at); }
        else { mixer.play(event.name, { at: event.at, tag: event.tag }); }
      }
      const buffer = await ctx.startRendering();
      const data = buffer.getChannelData(0);
      const energy = (start, end, channel = 0) => {
        const part = buffer.getChannelData(channel).subarray(Math.floor(start * rate), Math.floor(end * rate));
        return Math.sqrt(part.reduce((sum, v) => sum + v * v, 0) / Math.max(1, part.length));
      };
      return { data, energy, peak: data.reduce((p, v) => Math.max(p, Math.abs(v)), 0), stats: mixer.snapshot() };
    }
    const names = Object.keys(SFX_CONFIG.cues), events = names.map((name, i) => ({ name, at: i * 1.5 }));
    const reel = await render(events, names.length * 1.5 + 1);
    const filtered = await render(events, names.length * 1.5 + 1, 0.75, true);
    const cues = Object.fromEntries(names.map((name, i) => [name, {
      rms: reel.energy(i * 1.5, i * 1.5 + 0.6), midrangeRms: filtered.energy(i * 1.5, i * 1.5 + 0.6)
    }]));
    const spam = [];
    for (let i = 0; i < 300; i++) {
      for (let finger = 0; finger < 5; finger++) { spam.push({ name: i % 2 ? "hit" : "redPress", at: i / 100 }); }
      if (i % 3 === 0) spam.push({ name: "death", at: i / 100 });
    }
    const important = [{ name: "charge1", at: 0.4 }, { name: "charge2", at: 1 }, { name: "charge3", at: 1.5 }, { name: "interrupt", at: 1.9 }, { name: "coreDestroyed", at: 2.5 }];
    const mixedEvents = spam.concat(important).sort((a, b) => a.at - b.at);
    const stress = await render(mixedEvents, 4, 1);
    const stressPhone = await render(mixedEvents, 4, 0.25, true);
    const masking = important.map(e => ({ name: e.name,
      mixRms: stressPhone.energy(e.at, e.at + 0.2), spamRms: stressPhone.energy(e.at, e.at + 0.2, 1),
      criticalRms: stressPhone.energy(e.at, e.at + 0.2, 3) }));
    const old = await render([{ name: "hit", at: 0 }], 1, 0.75, true, true);
    const current = await render([{ name: "hit", at: 0 }], 1, 0.75, true);
    const mute = await render(events, names.length * 1.5 + 1, 0);
    const interrupted = await render([{ name: "charge2", at: 0, tag: "charge" }, { stop: "charge", at: 0.05 }], 1);
    const quietImpact = await render([{ name: "coreImpact", at: 0 }], 1, 0.25);
    const loudImpact = await render([{ name: "coreImpact", at: 0 }], 1, 0.75);
    // Mute a playing failure and a future bank, then unmute before that bank was due.
    const muteContext = new OfflineAudioContext(1, rate, rate);
    const muteMixer = ContainmentSfx.createEngine(muteContext, muteContext.destination);
    muteMixer.play("breach"); muteMixer.play("bank", { delay: 0.65 });
    const suspended = muteContext.suspend(0.1), rendered = muteContext.startRendering();
    await suspended; muteMixer.setSettings({ muted: true, volume: 0.75 });
    const secondSuspend = muteContext.suspend(0.3); await muteContext.resume();
    await secondSuspend; muteMixer.setSettings({ muted: false, volume: 0.75 }); await muteContext.resume();
    const mutedTail = (await rendered).getChannelData(0).subarray(Math.ceil(rate * 0.12));
    const muteTailPeak = mutedTail.reduce((p, v) => Math.max(p, Math.abs(v)), 0);
    function wav(data) {
      const bytes = new ArrayBuffer(44 + data.length * 2), view = new DataView(bytes);
      function str(offset, text) { [...text].forEach((ch, i) => view.setUint8(offset + i, ch.charCodeAt(0))); }
      str(0, "RIFF"); view.setUint32(4, 36 + data.length * 2, true); str(8, "WAVEfmt "); view.setUint32(16, 16, true);
      view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true);
      view.setUint16(32, 2, true); view.setUint16(34, 16, true); str(36, "data"); view.setUint32(40, data.length * 2, true);
      data.forEach((v, i) => view.setInt16(44 + i * 2, Math.round(Math.max(-1, Math.min(1, v)) * 32767), true));
      const u8 = new Uint8Array(bytes); let binary = "";
      for (let i = 0; i < u8.length; i += 8192) binary += String.fromCharCode(...u8.subarray(i, i + 8192));
      return btoa(binary);
    }
    return { cues, names, peak: stress.peak, stats: stress.stats, masking, silence: mute.peak, muteTailPeak,
      volumeRatio: loudImpact.energy(0, 0.6) / quietImpact.energy(0, 0.6),
      interruptTail: interrupted.energy(0.1, 0.5), oldMidrange: old.energy(0, 0.1), newMidrange: current.energy(0, 0.1),
      reel: wav(reel.data), stress: wav(stress.data), filtered: wav(filtered.data) };
  });
}

async function validateAudio(page) {
    const audio = await renderAudio(page);
    writeFileSync(output + "/vocabulary.wav", Buffer.from(audio.reel, "base64"));
    writeFileSync(output + "/stress.wav", Buffer.from(audio.stress, "base64"));
    writeFileSync(output + "/vocabulary-300-4000hz.wav", Buffer.from(audio.filtered, "base64"));
    delete audio.reel; delete audio.stress; delete audio.filtered;
    report.audio = audio;
    assert(audio.peak < 0.9, "full-volume stress mix retains headroom");
    assert.equal(audio.silence, 0, "zero volume renders silence");
    assert.equal(audio.muteTailPeak, 0, "mute cancels playing and future voices without reappearing on unmute");
    assert(Math.abs(audio.volumeRatio - 3) < 0.001, "25 to 75 percent gives proportional output gain");
    assert(audio.interruptTail < 0.00001, "cancelled charge has no late second chirp");
    assert(audio.newMidrange > audio.oldMidrange * 2, "Arena attack has more useful midrange than old tone");
    for (const entry of audio.masking) assert(entry.criticalRms > entry.spamRms * 3, entry.name + " exceeds simultaneous ducked spam in the 300-4000 Hz band");
    for (const name of ["charge1", "interrupt", "coreImpact", "coreDestroyed", "redline", "purge", "breach"]) {
      assert(audio.cues[name].midrangeRms > audio.cues[name].rms * 0.4, name + " does not depend on deep bass");
    }
    return audio;
}


(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage(), errors = [];
  page.on("pageerror", e => errors.push(e.message));
  try {
    await page.goto(base + "/index.html");
    if (process.argv.includes("--mix-only")) { await validateAudio(page); console.log("Offline mix checks passed."); return; }
    assert.equal(await page.evaluate(() => ContainmentSfx.snapshot().state), "locked", "no autoplay on lobby load");
    await page.locator(".lobby-sfx summary").tap();
    await page.waitForFunction(() => ContainmentSfx.snapshot().state === "running");
    await page.locator("#lobbySfxVolume").fill("43");
    await page.locator("#lobbyMuteBtn").tap();
    assert.equal(await page.evaluate(() => ContainmentSfx.snapshot().master), 0);
    await page.goto(base + "/arena.html"); await page.waitForFunction(() => window.__containmentArena);
    assert.deepEqual(await page.evaluate(() => ContainmentSfx.settings()), { muted: true, volume: 0.43 });
    await page.locator("#arenaSettings summary").tap();
    await page.locator("#arenaMuteBtn").tap();
    await page.locator("#arenaSfxVolume").fill("75");
    await page.screenshot({ path: output + "/arena-settings-mobile.png", fullPage: true });
    await page.locator("#arenaMount canvas").scrollIntoViewIfNeeded();
    // Normal opening wave, actual pointer input and spawner, with no progression fixture.
    const start = Date.now();
    while (Date.now() - start < 35000) {
      const state = await page.evaluate(() => {
        const s = __containmentArena.scene, e = s.enemies.find(e => e.active);
        return { wave: s.state.wave, phase: s.state.wavePhase, enemy: e && { x: e.x, y: e.y } };
      });
      if (state.phase === "cleared" || state.wave > 1) break;
      if (state.enemy) {
        const box = await page.locator("#arenaMount canvas").boundingBox();
        await page.touchscreen.tap(box.x + state.enemy.x / 960 * box.width, box.y + state.enemy.y / 620 * box.height);
      }
      await pause(100);
    }
    assert(await soundCount(page, "hit") > 0); assert(await soundCount(page, "death") > 0);
    assert(await page.evaluate(() => __containmentArena.scene.state.highestWaveCleared >= 1), "normal opening wave clears");
    await page.locator("#arenaReviewUpgradesBtn").click();
    const upgrade = page.locator(".arena-upgrade-card").filter({ has: page.locator(".upgrade-name", { hasText: "Heavier Cursor" }) });
    await upgrade.tap(); assert(await soundCount(page, "upgrade") > 0);
    await page.locator("#arenaShopResumeBtn").tap();
    await page.evaluate(() => {
      const s = __containmentArena.scene; __containmentArena.clearEnemies(); s.spawningEnabled = false;
      s.state.wave = 7; s.state.wavePhase = "active"; ARENA.Endless.startWave(s.state);
      __containmentArena.spawnEnemyAt(480, 250, 100000); const boss = s.enemies.at(-1);
      ARENA.Endless.setupBoss(s, boss); boss.health = boss.maxHealth = 100000;
      s.state.endless.attack = ARENA.BALANCE_CONFIG.endless.bossAttackSeconds - ARENA.BALANCE_CONFIG.endless.bossWindupSeconds;
      s.state.pulseCharge = 100; s.refreshUi();
    });
    assert(await soundCount(page, "arrival") > 0);
    const hits = await soundCount(page, "hit");
    await fiveFingers(page, "#arenaMount canvas", 10);
    assert(await soundCount(page, "hit") + await soundCount(page, "miss") > hits);
    assert(await soundCount(page, "charge1") > 0, "charge starts during taps before impact");
    await page.locator("#arenaPulseBtn").tap();
    assert(await soundCount(page, "pulse") > 0); assert(await soundCount(page, "interrupt") > 0);
    await page.evaluate(() => {
      const s = __containmentArena.scene;
      s.state.endless.attack = ARENA.BALANCE_CONFIG.endless.bossAttackSeconds;
    });
    await page.waitForFunction(() => ContainmentSfx.snapshot().played.coreImpact > 0);
    await page.evaluate(() => {
      const s = __containmentArena.scene; s.state.endless.core = 1;
      s.state.endless.attack = ARENA.BALANCE_CONFIG.endless.bossAttackSeconds;
    });
    await page.waitForFunction(() => ContainmentSfx.snapshot().played.coreDestroyed > 0);
    assert.equal(await page.evaluate(() => ContainmentSfx.play("hit")), false, "defeat leaves quiet space");
    await pause(1150);
    const warningCount = await soundCount(page, "overrun");
    await page.evaluate(() => { const s = __containmentArena.scene; for (let i = 0; i < 30; i++) { s.soundSystem.pressure(i % 2 ? 84 : 86); } });
    assert.equal(await soundCount(page, "overrun") - warningCount, 2, "one cue per important threshold, no boundary chatter");
    report.arena = await page.evaluate(() => ContainmentSfx.snapshot());

    await seedBreach(page, { power: 0, runPowerEarned: 0, totalPowerEarned: 0 });
    await fiveFingers(page, "#mainBtn", 10);
    assert.match(await page.locator("#clickCount").textContent(), /50/, "all fifty presses count");
    assert(await soundCount(page, "press") > 0); assert(await soundCount(page, "strained") > 0);
    await page.locator("#card-powerTap").tap(); assert(await soundCount(page, "upgrade") > 0);
    await page.locator("#stabilizeBtn").tap(); assert(await soundCount(page, "stabilize") > 0);
    await page.locator("#menuBtn").tap();
    await page.locator("#breachSfxVolume").fill("0");
    assert.equal(await page.evaluate(() => ContainmentSfx.snapshot().master), 0);
    await page.locator("#breachSfxVolume").fill("43");
    await page.locator("#soundBtn").tap();
    assert.equal(await page.evaluate(() => ContainmentSfx.snapshot().master), 0);
    await page.reload(); await page.locator("#menuBtn").tap();
    assert.equal(await page.locator("#breachSfxVolume").inputValue(), "43");
    assert.match(await page.locator("#soundBtn").textContent(), /OFF/);
    await page.locator("#soundBtn").tap(); await page.screenshot({ path: output + "/breach-settings-mobile.png", fullPage: true });
    await page.keyboard.press("Escape");
    await seedBreach(page, { instability: 74.8 });
    await page.locator("#mainBtn").tap(); assert(await soundCount(page, "redPress") > 0); assert(await soundCount(page, "redline") > 0);
    await page.locator("#cashOutBtn").tap(); assert(await soundCount(page, "cashOut") > 0);
    await pause(1000); assert(await soundCount(page, "bank") > 0);
    await seedBreach(page, { instability: 91, machine: { surge: 5.7 } });
    await page.locator("#mainBtn").tap();
    await page.waitForFunction(() => ContainmentSfx.snapshot().played.surge > 0);
    await page.locator("#purgeBtn").tap(); assert(await soundCount(page, "purge") > 0);
    await seedBreach(page, { instability: 99.6 });
    await page.locator("#mainBtn").tap(); assert(await soundCount(page, "breach") > 0);
    assert.equal(await page.evaluate(() => ContainmentSfx.play("press")), false);
    await pause(1400); assert(await soundCount(page, "bank") > 0);
    report.breach = await page.evaluate(() => ContainmentSfx.snapshot());

    await page.goto(base + "/index.html");
    const audio = await validateAudio(page);
    assert.deepEqual(errors, []);
    console.log("Audio browser checks passed.", JSON.stringify({ peak: audio.peak, arenaMidrangeRatio: audio.newMidrange / audio.oldMidrange, maxVoices: audio.stats.maxVoices }));
  } catch (error) {
    await page.screenshot({ path: output + "/failure.png", fullPage: true });
    throw error;
  } finally {
    writeFileSync(output + "/report.json", JSON.stringify({ ...report, errors }, null, 2));
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
