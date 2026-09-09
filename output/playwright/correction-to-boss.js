async (page) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.locator('#arenaRetry').click();
  for (let wave = 3; wave <= 6; wave++) {
    const deadline = Date.now() + 20000;
    while (Date.now() < deadline) {
      const target = await page.evaluate(() => {
        const s = window.__containmentArena.scene;
        const enemy = s.enemies.find(e => e.active);
        const r = s.game.canvas.getBoundingClientRect();
        return { phase: s.state.wavePhase, x: enemy && r.x + enemy.x * r.width / 960, y: enemy && r.y + enemy.y * r.height / 620 };
      });
      if (target.phase === 'cleared') break;
      if (target.phase !== 'active') throw new Error('Unexpected failure');
      if (target.x != null) await page.mouse.click(target.x, target.y);
      await page.waitForTimeout(90);
    }
    await page.locator('#arenaNextWaveBtn').waitFor({ state: 'visible' });
    if (await page.evaluate(() => window.__containmentArena.scene.state.wave) !== wave) throw new Error('Wrong wave');
    await page.locator('#arenaNextWaveBtn').click();
  }
  await page.waitForFunction(() => window.__containmentArena.scene.enemies.some(e => e.gigaboss));
  await page.keyboard.press('p');
  console.log('Reached wave 7 with normal mouse input, no purchases and no modules. Paused for inspection.');
}
