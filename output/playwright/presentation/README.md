# Presentation acceptance — 2026-09-10

The root page is now the shared Containment lobby. Arena and Breach retain independent saves and progression. The existing Breach page moved to /breach.html; /arena.html remains Arena.

## Experience changes

- Repeated production numbers, ordinary hit/helper/kill labels, repeated instructions and duplicate defeat messages were reduced. Common kills no longer add a full-field flash; chain milestones show once per session instead of repeatedly competing with combat.
- Arena pressure uses a threshold-marked meter, strengthening field border and inward corner marks. Boss charge links the source to the Core with a moving arrow and target ring. Siege adds heavier rails; Brood shows summon marks and links to spawned runners; Plated panels close between strikes and open during charge, matching existing armor rules. Damage builds fracture marks before an interrupt. The Core loses housing segments, cracks, and remains visibly destroyed after a lethal strike, with enemies retained.
- Breach Danger fills the ring around the button and lights progressively more vents. Redline begins at the existing 75% threshold; stronger motion starts at the existing 90% surge threshold. Output stays numeric with a compact risk-progress meter. Stabilize shows cooling rings, quieter output, the reduced multiplier and falling Danger. Controlled shutdown draws output toward the reward area; catastrophe ruptures the machine and loses the risk display. Guaranteed and risk rewards remain explicit in both summaries.
- Costs, exact upgrade/module effects, replacement slots, output sacrifice, surge size/countdown, and outcome rewards remain text. Optional help retains details that shapes alone cannot reliably explain, including armor's charge cycle, Pulse, pressure's effect on the next Core, and how risk is earned.
- The lobby has distinct illustrated game cards in a wrapping grid and consistent Lobby links with touch-sized targets. It contains no placeholder games or fake accounts, social features, rankings or rewards.

## Validation

- Inspected and played both original games before editing.
- Real pointer input cleared Arena wave one and released wave two without buying any upgrade. Normal spawning then produced rising Overrun and defeat.
- Targeted late-wave fixtures used the real spawner, clock and input paths. Pulse and ordinary hits interrupted charges with the Core intact. Brood produced runners; Plated closed/open states and source-linked Core destruction were inspected. Fixtures accelerate access to late states; they are not a complete normal-input replay through all endless cycles.
- Normal Breach input reached high Danger, activated Stabilize (Danger fell; output multiplier fell), cashed out, then produced a catastrophic run. No floating production labels appeared.
- Nonzero-risk fixtures confirmed 3 guaranteed + 2 risk = 5 banked, versus 3 guaranteed retained and 2 risk lost on catastrophe.
- npm run check: passed (52 JavaScript files; gameplay, Breach risk/drafts, Arena, containment and endless checks).
- npm run smoke:browser: passed.
- npm run smoke:arena: passed on rerun. First run failed an existing transient active-water-foam assertion; the rerun passed unchanged, including operation checks.
- node scripts/endless-ui-check.js: passed at desktop/tablet/mobile widths, including actual touch input, pause, interrupt, Emergency Purge and shutdown.
- npm run build: passed. Final production lobby checked at 1440×900, 820×1180 and 390×844: two real cards, no horizontal overflow, both game entries load, Breach accepts touch input, both return to the lobby, no page errors.
- git diff --check: passed.

## Limits / design discussion

Screenshots and emulated touch cover browser presentation, not physical-phone ergonomics or speaker/audio quality. There is no known blocking presentation issue in these checks. Plated armor intentionally opens and recloses instead of gaining a new permanent armor-break mechanic. Deciding whether traits deserve new distinct sound signatures remains a future design choice.

Screenshots in this directory include intermediate gameplay captures and final production lobby captures. production-check.json records the final route/overflow checks. ../endless/final-ui-report.json records the three-width touch replay.
