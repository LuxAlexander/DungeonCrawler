# Agreed decisions

All entries below were agreed on 2026-10-28. These describe the intended direction unless marked as existing behavior. They do not claim that future features are implemented.

## D-001: Purpose and collaboration

**Status:** Agreed; ongoing constraint.

DungeonCrawler is a portfolio project and a way for the owner to improve programming and AI-assisted development skills. The owner wants a high-level decision-making role and is comfortable with the assistant writing code. Explore ideas together and explain important tradeoffs.

Commit only when the owner explicitly requests it. Leave implementation changes uncommitted by default. The earlier authorization to publish the repository migration is not standing permission for future commits.

## D-002: Preserve the game's identity and player freedom

**Status:** Agreed; existing elements to preserve.

Keep the visual style of the penguin character, enemies, and items. Retain the leaderboard as a product feature, even while its backend is undeployed. Preserve multiple approaches: fight all enemies for more loot, or rush through the maze to advance sooner.

Combat, exploration, and character-building should all contribute to replayability. Avoid designing the game around just one of them.

## D-003: Run pacing

**Status:** Agreed direction; not yet balanced or implemented as a full run structure.

Aim for satisfying 15–30-minute runs, with the opening five minutes already fun and rewarding. A player should not have to invest a long session before experiencing the game's appeal.

Exact floor count, milestones, early reward timings, and ending conditions remain open. The suggested 20-minute final encounter is an idea, not an agreed requirement.

## D-004: Fight for loot or rush into greater danger

**Status:** Agreed direction; floor-based enemy scaling implemented in the working tree; loot/upgrade progression still open.

Rushing provides faster access to deeper floors but sacrifices loot available through fighting and exploration. Enemies become harder as the player advances, so skipping rewards has a meaningful cost.

Do not require clearing every enemy to reach the next floor. Both rushing and clearing should remain viable choices, with different risks and rewards.

Current code permits immediate exits and creates a chest after all enemies die. Floor-based enemy scaling now increases danger even when rushing without kills (D-011). Expanded loot/upgrade rewards still need design. A completion-time bonus has not been approved.

## D-005: Run power resets; persistent rewards do not grant power

**Status:** Agreed direction; run-only exit-shop upgrades implemented; persistent achievements/cosmetics remain unimplemented.

Upgrades and character power reset at death/new run. Achievements and cosmetic unlocks may persist across runs. Avoid persistent stat advantages so leaderboard runs remain comparable with respect to unlocks.

Achievement criteria, cosmetic rewards, persistence storage, and leaderboard ranking rules remain open. This decision does not claim the current client-submitted leaderboard is cheat-resistant.

## D-006: Combat should reward attention

**Status:** Agreed direction; initial hit feedback and telegraphed melee implemented in the working tree, with further combat design open.

Aim between deliberate dodging/timing and frantic crowd combat: simple controls, fewer enemies, and each enemy demanding attention. Make threats readable and dangerous, rather than relying only on higher health or larger crowds.

The owner identified weak-feeling enemies, mazes lacking personality, and limited progression as the main shortcomings. Specific attacks, enemy types, movement abilities, and numerical balance are still proposals.

## D-007: One repository, separate components

**Status:** Implemented repository structure; deployments not verified.

Use `frontend/` and `backend/` within the DungeonCrawler GitHub repository, preserving both original histories and separate Netlify/Railway deployment configuration. The migration was merged through [PR #1](https://github.com/LuxAlexander/DungeonCrawler/pull/1).

The backend is currently undeployed, and the owner does not want a separate local backend or development database provisioned. Keep the original local backend checkout intact. Deleting the old GitHub backend repository was authorized but the attempted API deletion returned HTTP 403; deletion remains unverified until explicitly checked again.

## D-008: First improvement — smoother movement and more information

**Status:** Implemented in the working tree; uncommitted.

The owner requested smoother movement against collision blocks and a left stats panel opposite the leaderboard. Preserve the current artwork, weapons, and freedom to rush. The implementation uses axis-separated swept collision, live run/build readings, and a responsive three-column layout. Related input, health-display, restart, bounds, and game-over fixes support reliable movement and readings. This does not implement the broader combat, loot, or floor-based difficulty redesign.

## D-009: Readable combat, purposeful enemies, and offline scores

**Status:** Implemented in the working tree; uncommitted.

The owner requested hit feedback, indicated/discrete enemy damage, a nicer sword arc, better enemy walking, and a local leaderboard when the API is unavailable. The implementation adds flashes/damage numbers, warned melee pulses with a player recovery window, a directional sword crescent, tile-route pursuit/roaming, and a browser-persistent local score fallback. The existing artwork and separate backend contract are preserved.

Initial timing/damage values are tuning choices to playtest, not permanent balance commitments. Local scores stay separate from online scores and are not automatically uploaded. There is no new local backend. A slime leap remains proposed; the warned contact strike does not implement it. Elemental variants were subsequently requested in D-010.

## D-010: Dungeon atmosphere, richer HUD, and elemental slimes

**Status:** Implemented in the working tree; uncommitted.

The owner requested more interesting walls/background and top bar, plus fire and water slimes. Fire ground effects must damage the player, and water must make the player slide forward. The implementation preserves the penguin/items and slime silhouettes while adding stone/moss/torch detail, an expedition HUD, and green Moss, orange Ember, and blue Tide variants.

Each floor includes all three types among four enemies. Shots make matching ground patches; elemental enemies also leave trails and death patches. Fire uses visible damage pulses; water uses forward momentum with limited steering and a brief exit tail. Effects respect walls, expire, and clear on floor changes. Exact durations/speed/damage are initial implementation choices for playtesting. Maze layout generation, floor difficulty, upgrade progression, and backend infrastructure are unchanged.

## D-011: Deeper floors get harder; arrow keys aim the bow

**Status:** Implemented in the working tree; uncommitted.

The owner requested increasing floor difficulty and more interesting bow projectiles fired directly with directional arrows. “Y and X” was interpreted as simultaneous vertical and horizontal arrow directions for diagonal fire. WASD now handles movement; arrows independently aim/fire and automatically select a collected bow. Space and Q retain equipped-weapon attack/switch roles. No bow is granted automatically.

Difficulty now depends on depth, replacing per-kill scaling. Health/melee damage rise every floor; movement/shooting acceleration is capped, and warnings stay readable. The arrow has a rotated head, shaft, fletching, glowing trail, finite range, normalized diagonal speed, and swept wall/target collision. Exact scaling is initial tuning, not a settled long-run balance.

## D-012: Optional exit upgrades and a more recognizable door

**Status:** Implemented in the working tree; uncommitted. Puzzle ideas remain proposals.

The owner requested a better-looking door and upgrades when leaving a floor at 25/50/150 gold tiers. The implementation offers a paused exit shop with stackable +10 maximum health (25), stackable +5 sword/bow damage (50), and unique Storm Spark chaining (150). These particular effects are implementation choices to playtest. All reset with the run, as agreed in D-005.

Buying is optional; the player can descend immediately or return to the floor for missed loot. The door keeps the free-exit rule from D-004 and adds stonework, wood/brass, rune glow, and a threshold. Spendable purse and total gold earned are separate; leaderboard gold records total earned. Escape returns to the floor; stepping away rearms the doorway.

The owner also requested puzzle ideas. Four optional treasure concepts are described in [puzzles.md](puzzles.md); no puzzle implementation or mandatory gating was approved by this request. Lantern order is the recommended first prototype, not an accepted delivery commitment.
