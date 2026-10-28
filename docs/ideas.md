# Ideas and open questions

These are proposals, not implementation commitments. Accepted high-level direction lives in [decisions.md](decisions.md).

## Candidate work

| ID | Idea | Status | Purpose and unresolved details |
| --- | --- | --- | --- |
| I-001 | Repair the current gameplay foundation | Partially implemented (uncommitted) | Wall sliding, live HP/stats, bounds, input focus handling, restart resets, frozen game over, and deferred door transitions are implemented. Further gameplay reliability work remains; see implementation log. |
| I-002 | Slime wind-up and dangerous leap | Proposed | Make the existing enemy demand attention with a readable attack. Set wind-up, range, recovery, damage, and wall interaction through playtesting. Supports D-006. |
| I-003 | Recognizable spaces inside generated mazes | Proposed | Treasure chambers, dangerous shortcuts, goo corridors, or safe rooms add identity while preserving the visual style. Choose one room type first; avoid assuming all are needed. |
| I-004 | Upgrade choice for clearing a floor | Proposed | Offer a choice of three upgrades as an alternative to rushing onward. Decide reward access, upgrade pool, stacking, and power budget. Supports D-004 and D-005. |
| I-005 | Difficulty that rises with deeper floors | Agreed direction | Required for the rushing tradeoff in D-004. Exact scaling, interaction with the existing per-kill increase, and enemy composition are undecided. |
| I-006 | Milestone encounters or a final boss | Proposed | Give longer runs structure and test the player's build. Floor count, encounter types, and whether a run has a fixed ending remain open. |
| I-007 | Achievements and cosmetic unlocks | Agreed direction | Persistent rewards without permanent combat advantages (D-005). Storage, criteria, and specific cosmetics remain undecided. |
| I-008 | Completion-time bonus | Proposed | Could reward rushing on the leaderboard, but may distort the freedom to explore. The owner agreed to faster access, not this specific bonus. |
| I-009 | Stronger hit feedback and distinct enemy roles | Implemented baseline (uncommitted) | Flashes, damage numbers, sword crescent, warned melee, and Moss/Ember/Tide ground-effect variants. Additional enemy roles remain open. |

| I-010 | Left run/build stats panel | Implemented (uncommitted) | Shows floor, time, HP, enemies left, weapon damage, movement speed, and condition; responsive layout keeps the leaderboard opposite. |

| I-011 | Purposeful enemy routes | Implemented (uncommitted) | BFS pursuit/roaming, corridor alignment, and swept collision replace random directions and wall blocking. |
| I-012 | Local leaderboard fallback | Implemented (uncommitted) | Browser top ten, safe rendering, three-second API timeout, persistent local backup, and session-only mode if storage is unavailable. |

| I-013 | Richer dungeon atmosphere and HUD | Implemented (uncommitted) | Cached masonry/flagstones/moss/torches, forest backdrop, depth/vitality/currency/inventory HUD, and live floor objective. Distinct room layouts remain proposed under I-003. |
| I-014 | Fire and water slime ground effects | Implemented (uncommitted) | Ember burns in pulses; Tide adds forward slide momentum. Matching shots, trails, and death patches; six-second lifetime. |

## Suggested first playable improvement

**Status: Proposed, not approved for implementation.**

Improve one complete floor: address reliability problems, make the slime threatening, add one distinctive room, and offer an upgrade choice for clearing enemies. Evaluate the result before expanding the feature set. This is a candidate sequence, not a promised delivery scope.

## Questions to settle when relevant

- The first slice implements movement reliability and live stats. Next, choose between slime combat and a larger one-floor prototype.
- How should floor depth affect difficulty, and should per-kill scaling be replaced?
- Which rewards make clearing worthwhile without making rushing a guaranteed failure?
- Which three upgrades are useful enough to produce different play styles?
- How should a 15–30-minute run end, if it has a fixed ending?
- How should leaderboard ranking recognize clearing, depth, gold, and speed? Preserve the current API contract until a change is deliberately designed.
- Where should achievements/cosmetics persist, given that no local backend is wanted and the remote backend is undeployed?

Revisit questions when their prerequisites are known; do not silently turn suggestions into accepted decisions.
