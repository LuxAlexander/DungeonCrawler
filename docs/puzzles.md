# Optional floor puzzle proposals

**Status: Ideas only. No puzzles are implemented yet.** Requested on 2026-10-28.

Puzzles should reward curiosity without blocking the exit or requiring every slime to die. They belong in optional treasure alcoves or side routes, so fighting, solving, and rushing remain valid choices. Exact rewards and frequency need balancing against the new 25/50/150-gold shop.

| ID | Puzzle | What the player does | Why it fits | Extra work / risks |
| --- | --- | --- | --- | --- |
| P-001 | Lantern order | Read three glyphs near the entrance, then activate matching lanterns in order to open a treasure niche. A mistake resets the sequence, not the run. | A short observation/memory break; no additional weapon or specific slime required. | Needs interaction input, clear glyphs/feedback, and a small generated alcove. Avoid a timer for the first version. |
| P-002 | Ember braziers | Lure Ember shots into two unlit braziers to open a bonus chest. Use walls and positioning to line up the shots. | Makes fire useful as well as dangerous and builds on the current slime projectiles. | Needs projectile/brazier interactions and an explicit completion rule. Must remain solvable if the Ember slime dies: provide another fire source or let the player skip it. |
| P-003 | Tide run | Use water momentum to slide across a short line of floor switches before they reset. | Turns the new sliding mechanic into a movement challenge. | Needs a purpose-built lane and generous timing. Reset locally on failure; avoid forcing players into lethal fire or consuming a finite resource. |
| P-004 | Rune circuit | Rotate a few marked stone tiles to connect an entrance rune to a sealed treasure niche. The completed route lights up. | Adds a readable spatial puzzle without making combat mandatory. | Needs rotation controls and visual connection states. Generate from a known solved configuration so a solution always exists. |

## Recommended first prototype

Start with **P-001: Lantern order**. It is small, can be introduced on an early floor, and does not depend on keeping an enemy alive or mastering slide timing. Prototype one hand-authored room before adding it to procedural generation.

Suggested acceptance criteria, not yet an approved implementation plan:

- The reward is optional and the floor exit remains accessible.
- Glyphs remain readable and distinct without relying only on color.
- A mistaken input gives clear feedback and allows another attempt.
- Completion awards a reward once per floor; leaving/re-entering the alcove cannot duplicate it.
- Generation preserves a traversable maze and a reachable clue, controls, and reward.
- A quick attempt should be worthwhile within a five-minute session; no exact time limit or reward amount is agreed yet.

## Decisions still open

- Which puzzle to build first, and the interaction key/control hint.
- Reward amount/type, appearance frequency, and room size.
- Whether clues stay visible while solving or require short-term recall.
- How puzzle rewards and ordinary chest gold balance the exit shop.
