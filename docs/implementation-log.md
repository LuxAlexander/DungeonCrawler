# Implementation log

Record completed work and actual validation here. Design approval alone is not implementation. Commit/merge/deployment status is separate from whether files have been changed.

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

## Entry format for future work

Use a dated heading and include:

- Status, including whether changes are uncommitted, committed, merged, or deployed.
- Related decision/idea IDs and a concrete description of changed behavior/files.
- Actual verification performed, with results.
- Known limitations, deferred work, and commit/PR references only when they exist.
