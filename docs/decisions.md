# Agreed decisions

D-001–D-012 were agreed on 2026-10-28; later entries carry their own dates. Later decisions supersede only the specified parts of earlier entries; retain earlier text as design history. Current behavior is summarized in README and AGENTS.md. These describe the intended direction unless marked as existing behavior. They do not claim that future features are implemented.

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

**Status:** Agreed direction; floor-based enemy scaling, enemy loot, exit upgrades, and Lantern Heart implemented in the working tree; balance remains open.

Rushing provides faster access to deeper floors but sacrifices loot available through fighting and exploration. Enemies become harder as the player advances, so skipping rewards has a meaningful cost.

Do not require clearing every enemy to reach the next floor. Both rushing and clearing should remain viable choices, with different risks and rewards.

Current code permits immediate exits and creates a chest after all enemies die. Floor-based enemy scaling now increases danger even when rushing without kills (D-011). Enemy coins/health, one-purchase exit upgrades, and Lantern Heart now supply rewards (D-014–D-017); further rewards remain open. A completion-time bonus has not been approved.

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

**Partially superseded:** Population superseded by D-013.

The owner requested more interesting walls/background and top bar, plus fire and water slimes. Fire ground effects must damage the player, and water must make the player slide forward. The implementation preserves the penguin/items and slime silhouettes while adding stone/moss/torch detail, an expedition HUD, and green Moss, orange Ember, and blue Tide variants.

Each floor includes all three types among four enemies. Shots make matching ground patches; elemental enemies also leave trails and death patches. Fire uses visible damage pulses; water uses forward momentum with limited steering and a brief exit tail. Effects respect walls, expire, and clear on floor changes. Exact durations/speed/damage are initial implementation choices for playtesting. Maze layout generation, floor difficulty, upgrade progression, and backend infrastructure are unchanged.

## D-011: Deeper floors get harder; arrow keys aim the bow

**Status:** Implemented in the working tree; uncommitted.

**Partially superseded:** Arrow-key auto-selection superseded by D-013.

The owner requested increasing floor difficulty and more interesting bow projectiles fired directly with directional arrows. “Y and X” was interpreted as simultaneous vertical and horizontal arrow directions for diagonal fire. WASD now handles movement; arrows independently aim/fire and automatically select a collected bow. Space and Q retain equipped-weapon attack/switch roles. No bow is granted automatically.

Difficulty now depends on depth, replacing per-kill scaling. Health/melee damage rise every floor; movement/shooting acceleration is capped, and warnings stay readable. The arrow has a rotated head, shaft, fletching, glowing trail, finite range, normalized diagonal speed, and swept wall/target collision. Exact scaling is initial tuning, not a settled long-run balance.

## D-012: Optional exit upgrades and a more recognizable door

**Status:** Implemented in the working tree; uncommitted. Puzzle ideas remain proposals.

**Partially superseded:** Shop limits, Heartstone, and special offers superseded by D-014; descent healing by D-016; puzzle status by D-016/D-017.

The owner requested a better-looking door and upgrades when leaving a floor at 25/50/150 gold tiers. The implementation offers a paused exit shop with stackable +10 maximum health (25), stackable +5 sword/bow damage (50), and unique Storm Spark chaining (150). These particular effects are implementation choices to playtest. All reset with the run, as agreed in D-005.

Buying is optional; the player can descend immediately or return to the floor for missed loot. The door keeps the free-exit rule from D-004 and adds stonework, wood/brass, rune glow, and a threshold. Spendable purse and total gold earned are separate; leaderboard gold records total earned. Escape returns to the floor; stepping away rearms the doorway.

The owner also requested puzzle ideas. Four optional treasure concepts are described in [puzzles.md](puzzles.md); no puzzle implementation or mandatory gating was approved by this request. Lantern order is the recommended first prototype, not an accepted delivery commitment.

## D-013: Ammo, equipped directional attacks, and larger later floors (2026-10-30)

**Status:** Implemented in the working tree; uncommitted. Supersedes D-011 arrow-key auto-selection and D-010 fixed enemy count.

**Partially superseded:** Bow damage superseded by D-015.

The owner requested arrow pickups, reduced bow damage, directional sword attacks on arrow keys, and more enemies at greater depth. Arrows now attack with the equipped weapon; Q switches weapons. Initial tuning: bow 12 base damage, first bow grants 8 arrows, two 6-arrow bundles per floor, one arrow spent per shot. Ammo can be collected before the bow, persists between floors, and resets per run. Enemies increase from four by one every two floors, capped at twelve, preserving all three elements and unrestricted exits. Numbers are implementation choices awaiting playtesting, not finalized balance.

## D-014: Scarcer healing, enemy loot, and rotating perk (2026-10-30)

**Status:** Implemented in working tree; uncommitted. Supersedes D-012 full descent healing, +10 Heartstone, unlimited floor purchases, and fixed special offer.

**Partially superseded:** Ring cooldown and player-impact patches superseded by D-015; descent healing by D-016.

The owner requested less healing, coins/small health from enemies, one upgrade between floors, a randomly rotating Fire Ring perk alongside Storm Spark, and damage from flying slime projectiles. Initial tuning: descent heals 15 HP; Heartstone grants 5 maximum HP; ordinary potions heal 25. Slimes drop 3–6 coins plus a 25% chance of a 5-HP potion. Small potions wait when health is full. One purchase per floor persists across shop reopening. Special offer is randomly Storm Spark or Fire Ring, fixed for that floor; owned offers cannot be bought again. Exits remain free and upgrades optional.

Fire Ring costs 150 gold and is owned for the run. A successful weapon hit triggers five seconds of 8-damage pulses every 0.5 seconds within 70px and line of sight; trigger cooldown 12 seconds. Ring damage cannot trigger perks, and the active effect clears on descent. Slime projectiles hit for 6 with swept collision, consume on player contact even during invulnerability, and stop at walls. These numbers and the ring trigger are implementation choices for playtesting.

## D-015: Stronger arrows and clearer Fire Ring (2026-10-30)

**Status:** Implemented in working tree; uncommitted. Supersedes D-013 bow damage and D-014 ring cooldown/player-impact patch behavior.

The owner requested increased arrow damage, clear Fire Ring area damage/marks, longer cooldown, a skill bar below vitality, and elemental ground effects from shots hitting the player. Bow base damage is now 20. Fire Ring retains five-second duration, 70px radius, 8-damage half-second pulses to all visible enemies inside; cooldown is now 20 seconds from activation. A translucent filled area and flame marks on affected slimes clarify coverage. The skill bar shows active duration, recharge progress, ready-on-hit state, or no-skill/passive Storm Spark text. Enemy shots now create their matching six-second ground patch on player contact, even if invulnerability blocks contact damage. Numerical changes remain tuning choices for playtesting.

## D-016: Safer arrivals, stronger descent heal, first-floor Lantern Order (2026-10-30)

**Status:** Implemented in working tree; uncommitted. Supersedes D-014 descent healing and P-001 proposal-only status.

**Partially superseded:** Fixed visible puzzle solution superseded by D-017.

The owner requested player spawns farther from every enemy, increased descent healing, and P-001 on floor one with an item healing5 HP per kill. Arrival position is reserved before spawning enemies; every enemy must be at least280px away (center distance), including initial/retry arrivals and later floors. Descent heals30 HP capped at maximum; other healing/shop values stay as previously tuned.

P-001 is an optional entrance alcove with a visible I → III → II clue, numbered lanterns activated with E, wrong-input sequence reset, and a one-time niche reward. Lantern Heart heals5 HP per kill for the run, including perk kills, capped at maximum without revival. Collection is required; ownership survives floors and resets per run. The exit remains unrestricted. Other puzzle proposals remain unapproved.

## D-017: Hidden randomized Lantern Order (2026-10-30)

**Status:** Implemented, uncommitted. Supersedes D-016 fixed visible solution.

The owner found the solution text too easy. Shuffle the three distinct lanterns once per new run and retain that order throughout attempts. Remove solution text from plaque, HUD, and mistake messages. Wrong choices reset progress and flash all three lanterns red for0.7 simulation seconds; correct choices stay lit. Pause freezes feedback. Puzzle reward and optional exit behavior remain unchanged.

## D-018: Phone and tablet touch controls (2026-10-30)

**Status:** Implemented in working tree; uncommitted.

The owner requested touch controls and easy mobile-browser play. A left thumb pad moves and a right thumb pad independently aims/attacks with the equipped weapon, including diagonals. Tap buttons switch weapons and interact with lanterns. Coarse-pointer devices show controls automatically; keyboard input remains available.

At up to 1100px width, touch layout uses a compact HUD, a player-following enlarged game view, and controls below the play area. Portrait and landscape are supported; run details and leaderboard remain accessible below. Pads suppress touch scrolling locally, with pointer capture/cancellation and existing reset/pause behavior. Page scrolling and browser zoom outside controls remain enabled. No gameplay balance or score contract changes. Physical-device ergonomics and Safari testing remain open.
