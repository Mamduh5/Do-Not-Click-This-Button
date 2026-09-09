async (page) => {
  const assert = (value, message) => { if (!value) throw new Error(message); };
  await page.waitForFunction(() => Boolean(window.__containmentArena));
  await page.locator('#arenaSettings summary').click();
  await page.locator('#arenaResetBtn').click();
  await page.locator('#arenaResetBtn').click();
  await page.locator('#arenaSettings summary').click();
  // Read target positions, then send actual mouse input to the canvas.
  for (let wave = 1; wave <= 2; wave++) {
    const deadline = Date.now() + 25000;
    while (Date.now() < deadline) {
      const target = await page.evaluate(() => {
        const s = window.__containmentArena.scene;
        const enemy = s.enemies.find(e => e.active);
        const r = s.game.canvas.getBoundingClientRect();
        return { phase: s.state.wavePhase, x: enemy && r.x + enemy.x * r.width / 960, y: enemy && r.y + enemy.y * r.height / 620 };
      });
      if (target.phase === 'cleared') break;
      assert(target.phase === 'active', 'opening remains active');
      if (target.x != null) await page.mouse.click(target.x, target.y);
      await page.waitForTimeout(130);
    }
    await page.locator('#arenaNextWaveBtn').waitFor({ state: 'visible' });
    const state = await page.evaluate(() => window.__containmentArena.scene.state);
    assert(state.wave === wave && state.wavePhase === 'cleared', 'wave cleared through mouse input');
    assert(Object.keys(state.upgrades).length === 0, 'no purchase required');
    if (wave === 2) {
      assert(state.endless.offers.length === 3 && state.endless.modules.length === 0, 'random offers earned without purchasing');
      await page.screenshot({ path: 'output/playwright/correction-arena-offers.png' });
    }
    await page.locator('#arenaNextWaveBtn').click();
    await page.waitForTimeout(200);
    assert(await page.evaluate(() => window.__containmentArena.scene.state.wave) === wave + 1, 'release works without upgrading or choosing');
  }
  await page.waitForFunction(() => window.__containmentArena.scene.state.endless.pressure >= 70);
  await page.screenshot({ path: 'output/playwright/correction-arena-pressure.png' });
  await page.waitForFunction(() => window.__containmentArena.scene.state.wavePhase === 'failed');
  assert(await page.locator('#arenaRetry').isHidden(), 'battlefield failure precedes retry summary');
  await page.screenshot({ path: 'output/playwright/correction-arena-failure-beat.png' });
  const positions = await page.evaluate(() => window.__containmentArena.scene.enemies.map(e => [e.x, e.y]));
  await page.locator('#arenaRetry').waitFor({ state: 'visible' });
  assert(await page.evaluate(p => JSON.stringify(window.__containmentArena.scene.enemies.map(e => [e.x,e.y])) === JSON.stringify(p), positions), 'defeated field retains frozen enemies');
  assert((await page.locator('#arenaDefense').textContent()).includes('OVERRUN 100%'), 'summary matches battlefield');
  await page.screenshot({ path: 'output/playwright/correction-arena-defeat.png' });
  console.log('PASS: waves 1 and 2 without purchases; deferred draft; natural wave 3 Overrun; frozen battlefield and matching delayed summary.');
}
