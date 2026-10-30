# Ideas and open questions

These are proposals, not implementation commitments. Accepted high-level direction lives in [decisions.md](decisions.md).

## Candidate work

| ID | Idea | Status | Purpose and unresolved details |
| --- | --- | --- | --- |
| I-001 | Repair the current gameplay foundation | Partially implemented (uncommitted) | Wall sliding, live HP/stats, bounds, input focus handling, restart resets, frozen game over, and deferred door transitions are implemented. Further gameplay reliability work remains; see implementation log. |
| I-002 | Slime wind-up and dangerous leap | Proposed | Make the existing enemy demand attention with a readable attack. Set wind-up, range, recovery, damage, and wall interaction through playtesting. Supports D-006. |
| I-003 | Recognizable spaces inside generated mazes | Partially implemented (uncommitted) | Floor-one Lantern Order has a connected entrance alcove; additional room types remain proposals. |
| I-004 | Upgrade choice for clearing a floor | Proposed | Offer a choice of three upgrades as an alternative to rushing onward. Decide reward access, upgrade pool, stacking, and power budget. Supports D-004 and D-005. |
| I-005 | Difficulty that rises with deeper floors | Implemented (uncommitted) | Per-floor HP/melee increases and capped movement/shooting acceleration replace per-kill scaling; warning stays fixed; population grows from 4 to 12 by one every two floors. Balance remains open. |
| I-006 | Milestone encounters or a final boss | Proposed | Give longer runs structure and test the player's build. Floor count, encounter types, and whether a run has a fixed ending remain open. |
| I-007 | Achievements and cosmetic unlocks | Agreed direction | Persistent rewards without permanent combat advantages (D-005). Storage, criteria, and specific cosmetics remain undecided. |
| I-008 | Completion-time bonus | Proposed | Could reward rushing on the leaderboard, but may distort the freedom to explore. The owner agreed to faster access, not this specific bonus. |
| I-009 | Stronger hit feedback and distinct enemy roles | Implemented baseline (uncommitted) | Flashes, damage numbers, sword crescent, warned melee, and Moss/Ember/Tide ground-effect variants. Additional enemy roles remain open. |

| I-010 | Left run/build stats panel | Implemented (uncommitted) | Shows floor, time, HP, enemies left, weapon damage, movement speed, and condition; responsive layout keeps the leaderboard opposite. |

| I-011 | Purposeful enemy routes | Implemented (uncommitted) | BFS pursuit/roaming, corridor alignment, and swept collision replace random directions and wall blocking. |
| I-012 | Local leaderboard fallback | Implemented (uncommitted) | Browser top ten, safe rendering, three-second API timeout, persistent local backup, and session-only mode if storage is unavailable. |

| I-013 | Richer dungeon atmosphere and HUD | Implemented (uncommitted) | Cached masonry/flagstones/moss/torches, forest backdrop, depth/vitality/currency/inventory HUD, and live floor objective. A floor-one puzzle alcove exists; other distinctive rooms remain proposed under I-003. |
| I-014 | Fire and water slime ground effects | Implemented (uncommitted) | Ember burns in pulses; Tide adds forward slide momentum. Matching shots, trails, and death patches; six-second lifetime. |

| I-015 | Directional bow controls and richer arrows | Implemented (uncommitted) | Equipped-weapon directional attacks, two-axis aim, independent WASD strafing, 20-damage finite arrows and swept collision. Bow uses ammo: 8 on first pickup, two 6-arrow bundles per floor. |

| I-016 | Recognizable exit door | Implemented (uncommitted) | Stone arch, wood/brass, glowing rune and threshold; opens optional shop. |
| I-017 | Exit upgrades at 25 / 50 / 150 gold | Implemented (uncommitted) | +5 max HP, +5 weapon damage, or a random Storm Spark/Fire Ring special offer; one purchase per floor, run-only and optional. |
| I-018 | Optional floor puzzles | Partially implemented (uncommitted) | P-001 Lantern Order on floor one has a hidden shuffled order and red mistake flashes, rewarding Lantern Heart (+5 HP per kill); other puzzles remain proposals. See [puzzles.md](puzzles.md). |

| I-019 | Mobile browser play | Implemented (uncommitted) | Independent move/aim thumb pads, switch/interact buttons, compact HUD, and player-following view. Emulated phone/tablet checks passed; physical-device/Safari ergonomics remain to test (D-018). |

## Historical first playable improvement proposal

**Status: Historical proposal, not an outstanding implementation commitment.** Movement, combat feedback, the exit shop, and a floor-one puzzle alcove now exist; the proposed clear-floor upgrade choice remains unapproved.

Improve one complete floor: address reliability problems, make the slime threatening, add one distinctive room, and offer an upgrade choice for clearing enemies. Evaluate the result before expanding the feature set. This is a candidate sequence, not a promised delivery scope.

## Questions to settle when relevant

- Playtest the current combat and floor-one puzzle before choosing the next enemy or room feature.
- How should floor scaling be tuned alongside future loot/upgrades? Initial per-floor scaling now replaces per-kill scaling.
- How should chest/puzzle rewards balance the new optional exit-shop upgrades without making rushing a guaranteed failure?
- Tune ammo supply, 30-HP descent healing, enemy coin/health drops, Lantern Heart, and the one-purchase shop (max HP, damage, Storm Spark/Fire Ring); consider further build choices after playtesting.
- How should a 15–30-minute run end, if it has a fixed ending?
- How should leaderboard ranking recognize clearing, depth, gold, and speed? Preserve the current API contract until a change is deliberately designed.
- Where should achievements/cosmetics persist, given that no local backend is wanted and the remote backend is undeployed?

Revisit questions when their prerequisites are known; do not silently turn suggestions into accepted decisions.
