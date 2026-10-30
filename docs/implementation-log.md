# Implementation log

Record completed work and actual validation here. This is a chronological history: values and limitations in old entries describe that stage, not necessarily the current game. See README/AGENTS for current behavior and decision supersession notes for changes. Design approval alone is not implementation. Commit/merge/deployment status is separate from whether files have been changed.

## 2026-10-28 — Repository consolidation

**Status:** Implemented and merged. Hosted deployment reconnection not verified.

- Combined the static game and Express/MongoDB service into `frontend/` and `backend/`.
- Preserved both Git histories with merge ancestry. Updated origin after the owner renamed the GitHub repository to DungeonCrawler.
- Added root and backend maintenance guidance, expanded README, Netlify/Railway configuration, ignored environment files, and credential-free environment placeholders.
- Replaced the backend's undeclared nodemon command with Node watch mode and its failing placeholder test script with an explicit syntax-check command.
- Updated the browser title to DungeonCrawler. Gameplay and backend runtime logic were unchanged.

**Evidence:** [PR #1](https://github.com/LuxAlexander/DungeonCrawler/pull/1), merged as `b18a5962683386b99121de42e0b4c3ff1570d071`.

**Verification performed:** JavaScript syntax checks, asset-path checks, mocked offline startup and two animation frames, package/lock consistency, runtime-source comparison allowing line-ending differences, and ancestry checks for both original repositories. Local main was synchronized with the merged remote main.

**Limitations:** No full browser gameplay test, real database test, or score submission was performed. Backend remains undeployed. GitHub rejected deletion of the original JS_Backend repository with HTTP 403; it still existed at the last check. The original local backend checkout was preserved.

## 2026-10-28 — Design records and commit policy

**Status:** Documentation implemented in the working tree; uncommitted.

- Created `docs/` with an index, accepted decisions, proposed ideas/open questions, and this implementation log.
- Recorded the agreed fight-or-rush direction, run pacing, reset/persistence policy, combat feel, and visual identity.
- Linked the records from README and root AGENTS.md. Recorded that commits require an explicit owner request.

**Verification:** Checked local Markdown links, reviewed the distinction between agreed/proposed/implemented items, and ran `git diff --check`.

**Limitations:** No gameplay changes are included. Threatening enemy attacks, maze personality, floor-based difficulty, upgrade choices, and persistent unlocks remain unimplemented.

## 2026-10-28 — Wall sliding and left run stats

**Status:** Implemented in the working tree; uncommitted. Related: D-008, I-001 (partial), I-010.

- Replaced the player's combined collision check with axis-separated sweeps that stop at the nearest wall, allow wall sliding, preserve normalized diagonal speed, and prevent tunnelling. Enemy AI/movement and weapon balance are unchanged.
- Enforced room bounds and fitted the canvas to the full 1000 x 520 maze.
- Added a left panel for floor, active simulation time, health, living enemies remaining, weapon, damage, speed, and slow condition. Stats refresh each frame; inventory remains event-driven.
- Reworked layout into actual sidebar/game/sidebar columns, with panels below the game in narrow windows; anchored the death overlay to the game wrapper.
- Added uppercase input support, gameplay-key scroll prevention, editable-field protection, and key resets on focus loss/death/retry.
- Reset run state centrally; freeze simulation after death. Move door transitions to the end of simulation, clear old projectiles, and heal before refreshing stats.
- Added dependency-free regression coverage in `tests/game.test.cjs` and updated README/AGENTS guidance.

**Verification:** `node --check frontend/game.js` and nine Node regression tests passed: both wall-slide axes/corners, high-speed sweeps in both directions, world bounds/canvas geometry, diagonal normalization, live stats, floor changes, game-over freeze/restart, and keyboard focus. API calls are mocked; no leaderboard submissions or database writes.

**Limitations:** Browser preview could not reach the local server (connection timeout), so visual layout and subjective movement feel remain to be checked in a local browser. Run time counts capped active simulation time, not wall-clock time. Floor-based difficulty, new enemies, loot upgrades, and persistent rewards remain deferred.

## 2026-10-28 — Combat feedback, enemy routes, and local leaderboard

**Status:** Implemented in the working tree; uncommitted. Related: D-009, I-009 (partial), I-011, I-012.

- Hit flashes, floating damage numbers, and player red-border/blink feedback make damage visible. A 0.7-second protection window prevents stacked hits.
- Sword attacks draw a 0.24-second directional crescent and blade. Damage is applied once in a forward arc and blocked by walls. Arrows stop damaging further targets after their first hit.
- Slime contact no longer drains health continuously: a 0.4-second amber warning precedes a 12-damage strike, with a red strike ring and 0.85-second recovery. Stepping away avoids it.
- Slimes use BFS tile routes with corridor alignment, periodic pursuit replanning, roaming destinations, and elapsed-time goo cooldowns. Existing pixel art is preserved with a slight walking bob.
- Replaced fake leaderboard entries with a real localStorage top ten. Every submission creates a local backup; API failures/timeouts/invalid data display local scores. Buttons lock during submission; blocked storage retains session-only scores with a clear label. Offline history is never automatically uploaded.
- Unified safe leaderboard rendering and added API status/data validation, a three-second deadline, and stale-request protection. No backend infrastructure or contract changes.

**Verification:** Frontend syntax and 24 Node regression tests passed, including directional/wall-blocked sword hits, feedback, warned/dodgeable contact, invulnerability, maze navigation, single-target arrows, persistence/ranking, corrupted/blocked storage, safe names, HTTP/schema failures, online recovery, duplicate submission, timeouts, and stale requests. API/storage are mocked; no real score submissions or database writes.

**Limitations:** No visual browser playtest; the previous local preview connection timed out. Attack timing, range, and route feel need player feedback. Visual effects are verified through drawing calls, not screenshots. Local scores are browser/origin-specific and unverified; backend remains undeployed. New enemy roles, leaps, floor-based scaling, and upgrade progression are not implemented.

## 2026-10-28 — Dungeon atmosphere, HUD, and elemental hazards

**Status:** Implemented in the working tree; uncommitted. Related: D-010, I-013, I-014, I-009.

- Added deterministic stonework, floor seams/scuffs, moss, and torch sconces. Offscreen terrain caching preserves the detail without repainting every tile each frame.
- Replaced the plain top bar with an expedition header, depth badge, live/critical vitality bar, kill/gold counters, inventory, and floor objective. Updated background/panel colors and added a slime guide while retaining responsive sidebar placement.
- Added green Moss, orange Ember, and blue Tide slime palettes/crests. Each floor still has four enemies, including each type.
- Elemental shots create matching patches on wall impact; Ember/Tide also leave timed trails and death patches. Patches snap inside walkable tiles, refresh rather than stack by element/tile, last six seconds, and draw below actors.
- Fire deals 8 damage in protected pulses about 0.9 seconds apart. Water adds forward momentum, softer steering, and a short decaying exit slide; collision and floor changes clear relevant momentum/state. Status readings show the effects.

**Verification:** 35 Node regression tests passed, covering all prior behavior plus variant distribution, fire timing/expiration, water momentum and wall blocking, safe patch placement/deduplication, elemental death patches, floor resets, HUD state, and terrain caching. Isolated headless Edge rendered screenshots at 1536px, 768px, and 390px widths with no horizontal overflow or page errors. Desktop and phone screenshots were visually inspected. Real-browser integration verified fire reduced health/meter from 100 to 92 and water advanced the player with Sliding status. API requests were blocked; no real submissions or database writes occurred.

**Limitations:** Longer-run balance and subjective slide feel still need player testing. Additional distinct room layouts, enemy leaps, floor-based difficulty, and upgrade progression remain open. Screenshots and the temporary visual-check script are outside the repository in the session visualization folder. No commits or deployments were made.

## 2026-10-28 — Floor difficulty and directional bow

**Status:** Implemented in the working tree; uncommitted. Related: D-004, D-011, I-005, I-015.

- Replaced per-kill scaling with per-floor enemy health (+12 baseline HP/floor) and melee damage (+1/floor), plus gradually faster movement/shooting with caps. Floor one stays at 100 HP/12 damage; count remains four and warning remains 0.4 seconds. Added visible enemy health/damage stats.
- Split WASD movement from arrow-key bow aiming. A collected bow auto-selects and fires on held arrows; perpendicular keys make normalized diagonal shots and opposite keys cancel. Space/Q remain supported. Updated control documentation.
- Replaced the projectile rectangle with a rotated glowing arrowhead, shaft, fletching, and trail. Arrows enforce 300px range and use small swept steps for first-wall/first-target collision; damage/speed remain 20/420px per second.

**Verification:** 44 Node regression tests pass, including scaling without kills, no per-kill increase, fresh runs, late-floor speed/shot caps, bow selection without walking, four diagonal quadrants, opposing keys/no-bow behavior, strafing/cooldown/release, wall collision at large steps, finite range, and drawing calls. Isolated headless Edge with real keyboard events verified diagonal aim (speed magnitude 7 nominal px/frame) without movement and floor-two health/HUD at 112%. Existing responsive/terrain checks also passed with no browser errors. Real API traffic was blocked.

**Limitations:** Long-run balance still needs playtesting and expanded loot progression. Environmental fire damage is unchanged. Arrow keys intentionally no longer move the character. No commits, pushes, or deployments were made.

## 2026-10-28 — Rune door, exit shop, and puzzle proposals

**Status:** Implemented in the working tree; uncommitted. Related: D-012, I-016, I-017, I-018 (proposed only).

- Replaced the brown door rectangle with a stone arch, wood/brass panels, glowing rune, threshold, and direction marker.
- Door proximity opens a paused native-dialog shop. Players can buy, descend without spending, or return/Escape to the same floor. A doorway latch prevents immediate reopening; continuation advances once and restores upgraded max health.
- Added Heartstone (+10 max HP,25), Honed Steel (+5 damage to both weapons and future bow pickups,50), and unique Storm Spark (one visible nearby target at half damage,150). Purchases persist between floors and reset on a new run. Chain hits cannot recursively trigger more sparks or pass through walls.
- Separated spendable purse from total gold earned to preserve leaderboard/API meaning. Added upgraded max-health/perk/earned-gold readings and lightning feedback.
- Recorded four optional treasure puzzle proposals and recommended Lantern order as a first prototype. No puzzle gameplay was implemented.

**Verification:** 52 Node tests pass, including shop pause, affordability/stacking/unique purchase, invalid offer rejection, bow upgrade inheritance, nonrecursive/wall-blocked chaining, return/rearm, zero-gold skip, max-health refill, and restart resets. Isolated headless Edge exercised actual purchase buttons, descent, and Escape: all three purchases spent225, preserved225 earned, yielded110 HP/30 sword damage/Storm Spark, and carried upgrades to floor2. Shop at768px and390px had no horizontal overflow or browser errors. Desktop/phone screenshots were visually inspected; mobile shop scrolls vertically. Real API traffic was blocked.

**Limitations:** Upgrade economy and chaining strength need run-length playtesting. Puzzle interactions/rooms/rewards remain proposals. No commits, pushes, or deployments were made.

## 2026-10-30 — Bow ammunition and equipped directional combat

**Status:** Implemented, uncommitted; related D-013.

- Bow base damage reduced from 20 to 12; first bow grants 8 arrows, each floor adds two 6-arrow bundles alongside the original random pickups. Shots spend one arrow; no ammo means no projectile. Ammo survives floors and resets with the run. Sidebar displays remaining arrows.
- Arrow keys attack in the chosen direction with the equipped weapon, including diagonal sword swings. Q switches; automatic bow selection removed.
- Enemy count grows from four by one every two floors, capped at twelve. Element variety, existing stat scaling, and optional exits remain.
- Updated controls, README, maintenance notes, and regression expectations.

**Verification:** Frontend/backend syntax checks passed. All 55 offline Node tests passed, including ammunition exhaustion, pickup once-only behavior, retry/floor persistence, sword direction despite movement and bow ownership, and population/element/ammo distribution through floor 21. No real API writes.

**Limitations:** No browser playtest or visual verification in this session. Longer-run ammo economy and crowd difficulty need player testing. No commits or deployments.

## 2026-10-30 — Healing, enemy loot, shop limits, Fire Ring, and projectile damage

**Status:** Implemented, uncommitted; related D-014.

- Reduced descent healing to 15, Heartstone maximum HP to 5, and floor potions to 25. Enemy deaths drop 3–6 coins and a 25%-chance 5-HP potion; drops award once and count coins as earned gold. Small potions wait at full health.
- One purchase per floor persists across shop reopening. A fixed-per-floor random special slot offers Storm Spark or new Fire Ring; unavailable offers are hidden and rejected by purchase logic.
- Fire Ring triggers on weapon hits for five seconds, burns visible nearby enemies in half-second pulses, pauses with simulation, cannot chain, and clears on descent/retry. Flame motes surround the ring. Stats show both owned perks.
- All slime projectile types deal 6 contact damage using swept collision, stop at first wall/player, and respect invulnerability. Original elemental wall-impact patches remain.

**Verification:** All 59 offline Node regression tests passed; frontend/backend syntax and diff whitespace checks passed. Coverage includes persistent purchase/offer state, partial/capped healing, across-floor damage upgrades, loot once-only collection, full-health small potions, all projectile elements/walls/invulnerability, and ring duration/pulses/walls/pause/reset. No real API requests or writes in tests.

**Limitations:** Browser visuals and gameplay balance not verified this session. No commits or deployments.

## 2026-10-30 — Arrow damage, Fire Ring visibility and skill bar, impact patches

**Status:** Implemented, uncommitted; related D-015.

- Raised bow base damage from12 to20, including the existing upgrade inheritance. Ammo unchanged.
- Fire Ring remains area damage to every in-range visible enemy; added a translucent fill and flame/outline marks on slimes within the damaging area. Increased trigger cooldown from12 to20 seconds.
- Added skill status/recharge progress under vitality, showing active seconds, cooldown, ready-on-hit, no perk, or passive Storm Spark. Simulation pause and existing run/floor reset behavior remain.
- Slime shots now spawn their elemental ground patch on player contact as well as walls, even during invulnerability. Existing deduplication and six-second lifetime apply.

**Verification:** All62 offline regression tests passed, covering multi-target area damage, mark rendering calls and wall exclusion, skill states/reset, new damage and upgrade expectations, and player-impact patches for all three elements during invulnerability. Frontend/backend syntax checks and diff whitespace check passed. No real API writes.

**Limitations:** Browser visual inspection and subjective balance not performed in this session. No commits or deployments.

## 2026-10-30 — Reserved arrivals and floor-one Lantern Order

**Status:** Implemented, uncommitted; related D-016, P-001, I-018.

- Reserve player arrival before enemy placement and filter enemy candidates to >=280px center distance on every floor. Initial/retry Player uses the same reserved position. Descent heals30 HP, capped at maximum.
- Carve a small connected entrance alcove on floor one. Three numbered lanterns, plaque and persistent HUD clue/progress support E-key interaction. Wrong order resets only the sequence; completion opens one reward niche. Random pickups stay outside the alcove.
- Lantern Heart item grants5 HP per enemy kill, capped at max, no revival, once per death. Ownership persists across floors and resets on retry. No exit gating or later-floor puzzles added.
- Browser checks exposed quick E taps being lost between frames; interaction is now queued until consumed, with held-key repeats ignored. Blur/shop/death reset remains.

**Verification:** All65 offline regression tests passed. New coverage spans20 seeded runs through12 floors for >=280px enemy separation, walkable spawns, reachable lanterns, wrong sequence, tap/hold handling, reward uniqueness/collection, free exit, ownership persistence/reset, and capped/nonreviving kill healing. Frontend/backend syntax and whitespace checks passed. Isolated headless Edge verified real keyboard E solve, single reward pickup, healing60→65 after a kill, descent40→70, and safe floor-two spawn (~345px nearest enemy in that seed). Desktop/tablet/phone screenshots at1536/768/390px widths had no horizontal overflow; desktop/phone screenshots visually inspected. No browser errors; API blocked. Browser/server closed after checks.

**Limitations:** Long-run healing economy and subjective gameplay feel still need owner playtesting. No commits/deployments. Browser check script/screenshots live outside the repository in the session visualization folder.

## 2026-10-30 — Hidden random lantern sequence and mistake feedback

**Status:** Implemented, uncommitted; related D-017.

- Fisher–Yates shuffle selects a permutation once when floor-one puzzle is created. Attempts and shop reopening keep it fixed; a new run reshuffles (repeats across runs are possible).
- Removed solution from canvas plaque, HUD, and mistake text. Wrong input clears progress and sets a0.7-second simulation-time deadline; all lanterns pulse bright/dark red with glow. Correctly lit lanterns and the one-time reward remain.

**Verification:**66 offline regression tests passed, including permutation/variation, unchanged order on mistakes, absent solution text, flash timing/pause, and prior solve/reward checks. Frontend/backend parsing and whitespace checks passed. Isolated Edge verified wrong E input, randomized correct sequence, reward/heal/descent and responsive layouts with API blocked; no browser errors. Red-flash screenshot visually inspected. Browser/server closed.

**Limitations:** Subjective puzzle difficulty still needs player testing. No commits or deployment.


## 2026-10-30 — Documentation consolidation

**Status:** Documentation updated locally; uncommitted. No runtime changes in this pass.

- Consolidated AGENTS into current maintenance facts, replacing contradictory gameplay snapshots while retaining workflows, contracts, invariants, and pitfalls.
- Aligned README, ideas, and puzzle status with equipped directional combat, ammo, growing enemy counts, 30-HP descent healing, loot, one-purchase shops, Fire Ring, safe arrivals, and hidden randomized Lantern Order.
- Corrected the decision date introduction and added explicit supersession notes. Updated the docs index and distinguished chronological implementation history from current behavior.
- Clarified the shared API base URL, ordinary versus small potions, current room dimensions, and local implementation versus deployment status.

**Verification:** Cross-checked current descriptions against frontend source, checked local Markdown links and whitespace. Documentation-only pass; gameplay tests were not rerun. The last gameplay run passed 66 offline tests and the recorded browser checks.

**Limitations:** No deployment or remote-service verification; balance still needs playtesting.

## 2026-10-30 — Touch controls and mobile game view

**Status:** Implemented, uncommitted; related D-018, I-019.

- Added independent move/aim thumb pads with eight-way direction, deadzone, pointer capture/cancellation, and multi-finger support. Tap buttons switch weapons and interact with lanterns; weapon/ammo label updates live. Existing keyboard controls/cooldowns remain.
- Reset held touch state/capture on blur, hidden page, shop, death, and retry. Prevent scrolling only on pads/canvas; preserve page scrolling and zoom outside controls. Shop/game-over taps use large targets.
- Touch devices show controls automatically. At <=1100px width, compact HUD/view/controls fill screen in portrait/landscape; enlarged dungeon follows player in both axes. Side panels remain below and touch controls do not cover the playfield. Desktop retains full-room layout.
- Updated README, maintenance guide, decision, idea, puzzle input, and docs index.

**Verification:** All69 offline Node tests passed, including independent two-pointer input, cancellation/release, deadzone, pointer ownership, keyboard coexistence, touch actions, and shop/retry cleanup. Frontend/backend syntax and whitespace/link checks passed. Isolated headless Edge with touch/mobile emulation and real multi-finger touch events verified movement + directional sword attack, bow firing/ammo, switch and lantern taps, camera tracking near room edges, shop return, retry, and layouts320x568/390x844 portrait,844x390 landscape,768x1024 tablet. No horizontal overflow or controls outside viewport. Desktop controls hidden as intended. Portrait and landscape viewport screenshots visually inspected. Score API blocked; no browser errors, submissions, database, or deployment changes. Temporary browser/server closed.

**Limitations:** Physical Android/iPhone performance, thumb comfort, and Safari behavior remain untested. Browser script/screenshots are outside repository in the session visualization folder. No commits/deployments.

## 2026-10-30 — Minimal mobile interface

**Status:** Implemented, uncommitted; related D-019.

- Removed mobile header/HUD, stats sidebar, leaderboard, and extra grid spacing on coarse-pointer screens up to 1100px. Dungeon fills the viewport above essential touch controls; shop/game-over remain available. Desktop layout preserved.
- Removed redundant compact-header CSS and updated current documentation. No JavaScript or balance changes in this pass.

**Verification:** Isolated Edge mobile/touch browser checks passed at 320x568, 390x844, 844x390, and 768x1024: header and both panels hidden, controls within viewport, no horizontal overflow, simultaneous touch movement/attack, weapon/bow/lantern taps, camera tracking, shop return, and retry. Desktop header/panels remain visible and touch controls hidden. Portrait/landscape screenshots visually inspected; no browser errors. API blocked and browser/server closed. Markdown links and whitespace checked. Existing 69-test gameplay result was not rerun for this CSS/documentation-only pass.

**Limitations:** Physical-device/Safari comfort and performance remain untested. No commits or deployment.

## Entry format for future work

Use a dated heading and include:

- Status, including whether changes are uncommitted, committed, merged, or deployed.
- Related decision/idea IDs and a concrete description of changed behavior/files.
- Actual verification performed, with results.
- Known limitations, deferred work, and commit/PR references only when they exist.
