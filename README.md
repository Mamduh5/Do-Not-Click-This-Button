# Do Not Click This Button

## Development and deployment

Use Node.js 22.12+ (Node.js 22 LTS recommended).

| Task | Command |
| --- | --- |
| Install | `npm ci` |
| Development | `npm run dev` |
| Production build | `npm run build` |
| Production preview | `npm run preview` |
| Cloudflare local preview | `npm run preview:cloudflare` |
| Cloudflare deployment | `npm run deploy:cloudflare` |

The build produces `dist/index.html` and `dist/arena.html`. Open `/` and
`/arena.html` on the preview server; the existing links connect both games.
Vite emits the ordered classic scripts (including Phaser), processes CSS, and
copies `public/` assets. The existing Google Fonts stylesheet requires internet access.

Cloudflare Workers serves `dist/` using `wrangler.jsonc`, with no Worker runtime
entry point. Authenticate with `npx wrangler login` before deploying manually.
See the [Cloudflare static assets guide](https://developers.cloudflare.com/workers/static-assets/get-started/).

For Cloudflare Pages / Git integration, select the repository root and use:

```yaml
Build command: npm run build
Output directory: dist
```

No Pages-specific runtime code is required. Build output and Wrangler local state
are ignored by Git.

## Endless gameplay

Arena keeps its existing click, splash, shock, helper, cosmetic and Pulse systems.
Six preparation waves now lead to a Gigaboss on waves 7, 14, 21 and onward.
Crowded preparation waves raise Overrun; losing control fails the current wave.
Remaining pressure weakens the next boss's Core defense. Boss strikes are
telegraphed and can be interrupted with Pulse or enough damage during the charge.
Siege, Brood and Plated traits arrive separately, then combine in pairs. Upcoming
traits are visible during preparation. Brood adds accelerate the next strike;
Plated armor opens during the charge. There are no absolute immunities.

Failure preserves purchases, Energy and completed waves. Retry itself awards
nothing. A failed boss also offers a replay of the preceding preparation wave:
defeating enemies earns Energy, and clearing it returns to that boss. Previously
cleared waves never pay their clear bonus again. Field Training unlocks on wave 4
and remains repeatable. Earned cycle bonuses, enemy rewards and boss health grow
past the former scaling ceiling, while movement/concurrency remain bounded.

Arena module drafts begin after wave 2 and continue on eligible first clears.
Three active slots force choices among manual damage, helpers, Pulse, chains,
reach and control. Later offers replace a rotating slot; a complete build can
instead keep its current modules. Offers persist across reloads. Existing
upgrade purchases remain available as a reliable foundation.

Breach pays more Power at higher Danger. Producing above 75% also builds a
separate unbanked risk bonus; merely waiting at high Danger does not earn it.
At 90%, a visible six-second surge warning begins. Stabilize reduces production
while cooling. Cash Out banks the current run's base Shards plus its risk bonus.
At 100%, catastrophe banks only the base; permanent purchases remain intact.
Empty runs award zero, and prior lifetime earnings cannot be harvested again.

An emergency purge is available from 90% once per run. It forfeits the risk
bonus and half of held Power, then cools to 55% and starts stabilization.
The ordinary stabilization action remains repeatable. Two machine module slots
produce different combinations each run; the first draft uses basic choices,
then deeper interactions enter the pool. Offers recur with productive progress.
Machine Craft provides an uncapped permanent investment with linear costs.
The legacy `breachCount` counter counts completed runs, including shutdowns.

Power, currencies, saves and build choices remain separate between the games.
No accounts, shared economy, deployment, or expert challenge subsystem was added.

## Validation for the endless pass

With `npm run dev` running on port 5173:

```powershell
npm run check
npm run smoke:browser
$env:ARENA_SMOKE_URL = 'http://127.0.0.1:5173/arena.html'
npm run smoke:arena
node scripts/endless-browser.js
node scripts/endless-ui-check.js
npm run build
```

The existing checks and browser smoke suites passed. New deterministic checks
cover per-run rewards, idle risk, surge warnings, drafts, save migration,
retries, training returns, Core interrupts, Overrun failure and later cycles.
The real-input replay cleared Arena waves 1-7 with earned purchases and continued
to wave 8. A wave-14 fixture exercised boss failure, reload and training.
Breach's real-input replay exercised purchases, a draft, stabilization and
cash-out. Equal-earnings fixtures verified the shutdown/catastrophe reward split.
The two replay sections were validated separately after correcting the initial
harness wait for progressively hidden Breach controls.

Final desktop (1366px), tablet (900px), and mobile (390px) checks passed with no
page errors or horizontal overflow. They exercised touch damage, boss pause and
Pulse interruption, emergency purge and shutdown. Screenshots and machine-readable
results are in `output/playwright/endless/`; `final-*` artifacts reflect the final
layout. Wave-28 UI checks use seeded progression, not a claim of a natural climb.

The new systems remove the finite completion state and create ongoing build/risk
decisions. This pass does not establish long-term retention or prove equal strength
of every build: a natural multi-hour balance playtest remains useful. The bounded
module pools and reused champion presentation are deliberate scope choices.
