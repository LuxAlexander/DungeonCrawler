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

**Status:** Agreed direction; progression rules not implemented.

Rushing provides faster access to deeper floors but sacrifices loot available through fighting and exploration. Enemies become harder as the player advances, so skipping rewards has a meaningful cost.

Do not require clearing every enemy to reach the next floor. Both rushing and clearing should remain viable choices, with different risks and rewards.

Current code permits immediate exits and creates a chest after all enemies die. However, difficulty currently increases per kill, not per floor: this does **not** yet deliver the agreed rushing tradeoff. Decide floor-based scaling and reward balance before implementing this progression system. A completion-time bonus has not been approved.

## D-005: Run power resets; persistent rewards do not grant power

**Status:** Agreed direction; progression/unlock systems not implemented.

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
