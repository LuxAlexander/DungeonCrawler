# Optional floor puzzles

**Status:** P-001, P-004 and P-005 are implemented locally. P-002 and P-003 are proposals.

Puzzles should reward curiosity without blocking the exit or requiring every slime to die. They belong in optional treasure alcoves or side routes, so fighting, solving, and rushing remain valid choices. Exact rewards and frequency need balancing against the new 25/50/150-gold shop.

| ID | Puzzle | What the player does | Why it fits | Extra work / risks |
| --- | --- | --- | --- | --- |
| P-001 | Lantern order | Discover a hidden randomized order by activating numbered lanterns. Correct choices stay lit; mistakes reset progress and flash the lanterns red. | A short observation/memory break; no additional weapon or specific slime required. | Implemented on floor one: E interaction, numbered lanterns, red mistake flash, and one Lantern Heart reward. No timer or exit gating. |
| P-002 | Ember braziers | Lure Ember shots into two unlit braziers to open a bonus chest. Use walls and positioning to line up the shots. | Makes fire useful as well as dangerous and builds on the current slime projectiles. | Needs projectile/brazier interactions and an explicit completion rule. Must remain solvable if the Ember slime dies: provide another fire source or let the player skip it. |
| P-003 | Tide run | Use water momentum to slide across a short line of floor switches before they reset. | Turns the new sliding mechanic into a movement challenge. | Needs a purpose-built lane and generous timing. Reset locally on failure; avoid forcing players into lethal fire or consuming a finite resource. |
| P-004 | Rune Circuit | Rotate four marked stones to join the glowing source to the last rune. Connected sections light up. | Adds a spatial puzzle in a floor-two alcove. | Implemented. Grants a one-time Tempered Shard. |
| P-005 | Hidden cache | Inspect a green crack in the stonework on floor three to open a hidden alcove. | Rewards noticing the environment. | Implemented. Grants a one-time Mossstep Charm. |

## P-001: Implemented Lantern Order

Floor one has a hand-authored entrance alcove carved into tiles (1,1) through (5,3), connected to the maze's guaranteed starting tile. Player starts at (45,125); enemies spawn at least 280px away and random pickups stay outside the alcove. Three numbered lanterns have a hidden order shuffled once per new run. The plaque names the puzzle; the HUD shows instructions and progress without revealing the solution.

Press E or tap the **hand interaction icon** near a lantern (within 45px, clear line of sight). Quick taps queue until the next frame; holding does not repeatedly activate it. Incorrect order resets progress and flashes all three lanterns red for 0.7 simulation seconds, without damage or a puzzle timer. The order remains fixed across mistakes and shop visits. Solving opens the niche and spawns one Lantern Heart item. Collect it to heal 5 HP per enemy kill, capped at current maximum. It persists through floors, resets on retry, cannot stack, and cannot revive a dead player. Any player-caused enemy kill, including perk damage, qualifies.

The door never requires puzzle completion. Lantern Order appears once per run.

Verification: 66 offline regression tests passed, including random permutations, stable order during attempts, no solution text, and red-flash timing/pause; 20 seeded runs through 12 floors checked spawn separation. Isolated Edge checked real E taps, solve/reward collection, kill healing, descent, and desktop/tablet/phone layouts with API blocked; no browser errors or horizontal overflow. Desktop and phone screenshots were visually inspected. Longer-run balance remains to playtest.

## P-004 and P-005 — Rune Circuit and hidden cache

The Rune Circuit occupies a connected floor-two alcove. E or the hand icon turns the nearest visible rune stone 90° clockwise. Each turn updates the lit path from the source. The four stones start in a scrambled configuration derived from a solvable layout. Completing the circuit spawns a Tempered Shard once, adding 3 damage to current and future weapons when collected.

A crack on the western wall of floor three marks the hidden cache. Interacting within reach opens its tile and reveals the Mossstep Charm. Collecting it reduces the goo penalty from 50% to 25%. Both relics last for the current run, and descending is always optional.
