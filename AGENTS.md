# Project memory and maintenance guide

Applies to the whole repository. Gameplay notes describe the current uncommitted working tree as of 2026-10-30; historical changes and verification belong in `docs/implementation-log.md`. Preserve verified facts, workflows, decisions, and reproducible pitfalls here across sessions. Update this file and README when behavior changes. Proposed solutions below are not implemented fixes.

## Collaboration and design records

- Do not commit changes unless the owner explicitly asks. Approval of an idea or implementation does not authorize a commit. Leave edits uncommitted by default; publishing and merging also require authorization.
- Read `docs/README.md` and `docs/decisions.md` before gameplay design work. Use `docs/ideas.md` for proposals and unresolved questions, and `docs/implementation-log.md` for completed work and actual verification.
- Keep agreed direction, unapproved ideas, and implemented behavior distinct. Do not describe a design decision as shipped until the code and verification support it.
- Preserve the existing character/enemy/item visual style, leaderboard concept, and the option to clear floors or rush through them. The detailed accepted direction is in `docs/decisions.md`.

## Accepted decisions (2026-10-28)

- Product name: **DungeonCrawler**. Goal: portfolio project and practice in programming and AI-assisted development.
- The owner makes high-level decisions and authorizes the assistant to implement code; do not assume the owner wants to write features as exercises.
- Combine frontend and backend in this repository, preserving both histories and separate deployments. The owner explicitly approved deleting the old GitHub JS_Backend repository after merging; keep the original local backend checkout intact.
- The original migration covered structure, docs, local setup, and deployment configuration; gameplay work followed separately, as recorded below.
- The backend is currently undeployed. Do not provision a separate local backend or development database unless requested.
- GitHub repository renamed to LuxAlexander/DungeonCrawler; origin updated. Owner approved publishing and merging the migration to main. Deployment reconnection remains pending. The local checkout remains named JS_Game.

## Baseline (inspected 2026-10-28)

- Static HTML/CSS/JavaScript frontend in `frontend/`; Express/MongoDB backend in `backend/`. No frontend framework or build step; dependencies and lockfile live only in the backend. Headless frontend regression tests use Node's built-in test runner (`node --test tests/game.test.cjs`); there is no browser automation suite.
- `frontend/index.html` loads only `game.js` as a classic script at the end of the body, after all required markup.
- `frontend/game.js` owns the runtime. Section comments organize input, helpers/UI, tiles/rooms/dungeon, entities/items/living actors, weapons/projectiles, player/enemies/goo, chest/door, and engine/API code.
- `frontend/styles.css` owns presentation. Sprites are `images/pengu.ico` and `images/chest.ico`; favicon is `images/favicon.ico`.
- `frontend/drawing.js` is an unreferenced experiment, not another game entry point.
- Backend imported from https://github.com/LuxAlexander/JS_Backend with all three original commits preserved as merge ancestry. Root `netlify.toml` publishes only `frontend/`; `backend/railway.json` configures the API service.

## Runtime relationships

- Global `dungeon`, `player`, and `arrows` connect most classes. `initGame()` constructs the dungeon before assigning the new player. `Dungeon.nextLevel()` checks the existing player global when repositioning it; initialization order matters. `initGame()` clears the previous player before dungeon construction and resets keys, difficulty, bow state, run time, and frame timing.
- `animate()` uses one continuing `requestAnimationFrame` loop, caps delta time at 0.1 seconds, updates the room before the player, then updates projectiles in reverse, and checks doors after simulation. Game-over and shop frames only draw. Retry reuses the loop; do not start another.
- `Room.update()` draws cached terrain/doors, filters dead entities, resets terrain flags, updates ground hazards before other entities, then spawns a chest if neither enemies nor a chest remain. `Door.draw()` only renders; `Door.update()` opens the optional shop after simulation; `leaveFloor()` changes floors after the player chooses to descend.
- Room entities include enemies, items, chests, goo puddles, lanterns, and a puzzle reward niche. Global `arrows` holds both player arrows and enemy goo shots. Death sets a flag before later removal.
- Movement uses elapsed seconds multiplied by 60. Enemy routes are cardinal BFS paths through tile centers, replanned about every 0.65 seconds while pursuing. Wandering uses destinations rather than random frame directions; goo shooting uses elapsed-time cooldowns.
- `Dungeon.nextLevel()` sets difficulty to `1 + 0.12 * (floor - 1)` before enemy construction. Kills no longer scale difficulty. Floor changes preserve inventory, ammo, run upgrades, speed, score, and gold and heal 30 HP up to maximum.
- Required DOM IDs: `space`, `slain-count`, `hp-count`, `gold-count`, `inventory-list`, `log`, `leaderboard-list`, `game-over-overlay`, `final-score`, `player-name`, `submit-btn`, `retry-btn`. The game currently selects the first canvas rather than its ID.

## Workflow and validation

1. Inspect the relevant code and working tree; preserve unrelated changes.
2. Follow the existing plain JavaScript classes and section organization. Avoid adding tooling solely for small maintenance work.
3. After runtime edits, run `node --check frontend/game.js` and `npm --prefix backend run check`. This checks parsing, not browser behavior.
4. Serve the root with `py -m http.server 8000 --directory frontend` and open `http://localhost:8000`. Directly opening `frontend/index.html` also runs gameplay; HTTP provides a predictable origin.
5. For gameplay changes, check startup/sprites, movement/walls, sword kills, bow pickup/switch/direction, health/speed, goo slow, elemental shot contact/ground effects, chest reward once per floor, 30-HP descent healing, one shop purchase per floor, skill-bar state, Lantern Order mistakes/reward, death overlay, and retry. Use controlled state/randomness when reproducing random-room defects.
6. Inspect console/network errors. Mock API requests during submission tests; requests still target the old remote URL even though the backend is currently undeployed. Do not send dummy scores without explicit authorization.
7. Run `node --test tests/game.test.cjs` for movement, input, stats, reset, and transition regressions. Tests use a mocked DOM/canvas and offline API; they do not replace visual/browser playtesting. Report actual verification and limitations.

## Backend maintenance

- Read `backend/AGENTS.md` before backend changes. CommonJS modules, Express 5, MongoDB 7; Node.js minimum 20.19 (driver requirement).
- Use `npm --prefix backend ci` for dependencies. `npm --prefix backend run check` parses all backend source. No database is needed for this check.
- Use hosting variables for PORT, ATLAS_URI, DB_NAME; `backend/.env.example` contains placeholders only. Never copy the old .env or node_modules into version control.
- Deployment details and GitHub migration status are in README. The local migration branch is `codex/dungeoncrawler-monorepo`. Do not squash/rewrite its history if preserving both original histories.

## Backend contract

- Hardcoded base URL: `https://jsgame-production.up.railway.app`.
- GET `/api/leaderboard`: array with `name`, `score`, optional `gold`. Responses are validated and displayed by score descending, then gold; the local board uses the same top-ten ranking.
- POST `/api/submit-score`: JSON `{ username, score, gold }`, with `Content-Type: application/json`. Preserve the `username`/`name` distinction unless coordinating a contract change.
- Names are trimmed; empty names become `Unknown`. HTML limits input to 10 characters; this is not server validation.
- Remote availability and CORS configuration were not verified during this documentation update.

## Implemented movement and stats (current working tree, updated 2026-10-30)

- `Room.moveActor()` sweeps X and Y separately to slide the player along walls, clamp to room bounds, and stop high-speed movement at the nearest wall. Diagonal speed stays normalized. Enemies also use this collision helper while following BFS waypoints.
- Canvas is 1000 x 520; generated rooms currently use 25 x 12 tiles at 40px. CSS scales the display with its aspect ratio intact. Side panels occupy real grid columns; on narrow windows they sit below the game.
- Left stats panel shows floor, active simulation time, HP, living enemies remaining, selected weapon damage, movement speed in world pixels/second, and slow status. `updateStats()` refreshes values every frame without rebuilding inventory.
- Keep `floor-count`, `run-time`, `health-stat`, `remaining-count`, `weapon-stat`, `damage-stat`, `speed-stat`, and `status-stat` DOM IDs aligned with JavaScript. Existing top HUD and inventory remain.
- Input supports uppercase letters, ignores editable fields, prevents gameplay-key scrolling, and resets on blur/hidden/death/retry. New runs reset stats, and door transitions clear projectiles and heal before updating UI.

## Combat and offline scores (working tree, 2026-10-28)

- Sword: forward ~140-degree arc, 25 damage once at attack start, 0.24-second crescent animation, 0.4-second cooldown. Uses entity centers and line of sight; no sword damage through walls. Direction is locked for the visual swing. Bow damage remains 20; one arrow damages at most one enemy.
- Living actors flash on hit and emit floating damage numbers. Player hits show a red border and 0.7-second invulnerability/blink. Effects and sword visuals clear on retry and floor changes.
- Slimes show an amber 44px warning ring/! for 0.4 seconds, then strike for `12 + floor - 1` if still in range and visible. Red strike ring lasts 0.15 seconds; attack recovery is 0.85 seconds. These are initial tuning values, not a finalized balance decision.
- `Room.findPath()` uses BFS; align across corridors before following tile-center waypoints to avoid catching corners/replan backtracking. Slimes pursue within 280px, otherwise choose roaming destinations. No path planning through walls. Intentional wind-ups are stationary.
- API calls have a three-second abort deadline including JSON reads, validate HTTP status/data, and safely render names with textContent. A request counter prevents stale loads overwriting the latest mode.
- Local board: localStorage key `dungeoncrawler.scores.v1`, top ten by kills then gold. Save every submitted run locally before POST. Network failure shows the local board; blocked storage keeps session-only records with an honest label. Local records are not auto-uploaded. Origin/profile/site-data rules apply.
- `submitting` prevents duplicate saves and retry races. Backend request contract remains unchanged. Tests inject offline responses and storage; no real API writes.

## Elemental terrain and interface (working tree, 2026-10-28)

- `Tile.draw(ctx)` renders deterministic stone/moss/torch detail. `Room.drawTerrain()` caches tiles in an offscreen canvas; `generateLabyrinth()` invalidates the cache. Invalidate `room.terrain` if changing tiles after generation.
- HUD includes a native progress element `health-meter`, `floor-badge`, and `floor-objective`. Keep their IDs aligned with `updateStats()`. Low health changes the bar color. The sidebar includes a slime guide.
- `Enemy(x,y,element='goo')` supports goo/Moss, fire/Ember, water/Tide via `SLIME_TYPES`. Each floor guarantees one of each; additional types are random. Population starts at four and increases every two floors, capped at twelve. All keep current melee/pathfinding behavior and base stats. Art uses palette and crest differences.
- `GooShot` and `GooPuddle` carry an element. Elemental enemies leave trails every 2.4 seconds while moving (first eligible after 1.5 seconds) and on death. Enemy projectiles leave matching patches on wall or player impact, even if invulnerability rejects contact damage. GooShot sweeps in steps of at most 4px, checks walls before player overlap, deals 6 contact damage, and consumes itself once.
- `spawnHazard()` snaps to a walkable tile with 2px inset (36px patch); repeated same-element tile patches refresh to six seconds, not stack. Hazards draw/update before actors so sprites stay visible and flags affect movement that frame.
- Fire: 8 damage per accepted pulse, 0.9-second player-wide burn cooldown, shares 0.7-second invulnerability. Expired patches cannot hurt. Items do not revive a player killed by a hazard earlier in the frame.
- Water: seeds forward velocity at 1.35x current walking speed, maintains momentum with limited steering, blends back toward walking input for 0.45 seconds after leaving. Collision clears blocked velocity components; floor changes clear water/burn/slow state. These are initial tuning values.
- `player.onWater/inFire` reset before hazard updates each frame. `sliding/slideVelocity/slideTime` persist for the short slide tail. Status and speed readings reflect the effect.
- Isolated headless Edge browser checks now work via bundled Playwright when run outside the restricted process environment. Use a temporary browser profile, block real API traffic, and close browser/server afterwards. Desktop/tablet/mobile screenshots and fire/water integration were verified; no real API writes.

## Floor difficulty and directional bow (working tree, 2026-10-28)

- Each floor adds 12% of baseline enemy HP and one melee damage. Enemy speed is `min(2.8, 1.6 + 0.06 * depth)` in nominal pixels/frame; multiply by 60 for px/s. Shot interval multiplier is `max(0.55, 1/(1 + depth*0.06))`. Enemy count is `min(12, 4 + floor(depth / 2))`; the 0.4-second warning stays fixed; ground fire remains 8 damage. Depth is floor minus one.
- New enemies derive depth from current difficulty, which nextLevel sets before constructing them (initial Dungeon is not yet assigned globally). Do not reintroduce per-kill scaling.
- WASD moves; arrow keys aim and repeatedly attack with the equipped sword or bow. Perpendicular arrows combine to normalized diagonal aim; opposites cancel. Arrows never auto-select a bow. Space attacks with the equipped weapon; Q switches collected weapons. E queues one lantern interaction until consumed, even across keyup; repeats are ignored.
- Bow fires centered, normalized 420px/s arrows with a 300px range, rotated art and teal trail. Swept 4px steps stop at the first wall or target. Base damage is 20; one shot spends one `player.ammo`, and empty bows cannot fire. Ammo starts at zero, persists across floors, resets per run. First bow pickup grants 8; two guaranteed `arrows` bundles per floor grant 6 each, even before finding a bow. `ammo-stat` shows remaining ammo.
- HUD IDs `enemy-health-scale` and `enemy-hit-stat` display floor strength. Update README and control guide if changing input again. Regression and headless real-keyboard browser checks cover diagonal aim without walking, strafing, scaling without kills, and restart resets.

## Exit shop and run upgrades (working tree, 2026-10-28)

- `Door` renders a stone arch, wood/brass leaves, rune, threshold, and DESCEND marker. Proximity opens `floor-shop` (native dialog), not a direct floor transition. The `armed` latch resets only after stepping away, so returning from the shop does not reopen it immediately.
- `shopOpen` pauses simulation/projectiles/hazards/run time and blocks game input; `returnToFloor()`/ Escape resume the same floor. `leaveFloor()` advances once, clears floor effects/keys, and heals 30 HP up to current maximum. Purchases are optional, including with zero gold.
- `SHOP_OFFERS`: vitality/Heartstone costs 25 for +5 max HP; damage/Honed Steel costs 50 for +5 sword/bow damage, stackable across floors; special slot costs 150 and randomly offers Storm Spark or Fire Ring. `dungeon.perkOffer` stays fixed for the floor. Owned special perks cannot be repurchased; an owned offer is not automatically replaced. `dungeon.shopPurchased` allows only one successful purchase per floor, including after reopening. Both reset in nextLevel. Future bows inherit `player.damageBonus`; a new Player resets all upgrades.
- `goldCollected` remains lifetime gold earned in this run for leaderboard/API compatibility. `goldSpent` tracks purchases; wallet = earned minus spent. HUD/shop show wallet; sidebar/score submission show earned. Avoid subtracting spending from the submitted gold total.
- Weapon hits use `strikeEnemy()`. Storm Spark calls direct `onHit` on one nearest visible target within90px at rounded half damage; this deliberately prevents recursive chaining. Lightning effects render through `drawEffects()` and freeze with the shop.
- Additional DOM IDs: `max-hp-count`, `gold-earned-stat`, `perk-stat`, and shop controls. Native dialog gives modal focus behavior; Escape returns to the current floor. Tests mock showModal/close; isolated browser checks exercise actual buttons, dialog, and keyboard cancellation.
- P-001 Lantern Order is implemented on floor one; P-002–P-004 in `docs/puzzles.md` remain proposals. Never add mandatory exit gating as a side effect of puzzle work.

## Pitfalls and proposed solutions

| Pitfall / cause | Solution when addressing it |
| --- | --- |
| Door at x=960 overlaps the boundary wall and opens the shop on proximity without enemy/chest gating. This preserves the agreed rushing option. | Verify approachability after generation/collision edits. Implement explicit exit state and a walkable doorway if gating is requested. |
| `drawing.js` redeclares top-level `canvas` and uses undefined `start`, `end`, `theta`, and `brush`. | Keep it unloaded until its scope is isolated and unfinished example code is replaced. Parsing checks will not detect these runtime faults. |
| Pickups can overlap entities; ordinary full-health potions are consumed; small enemy-drop potions wait until health is missing. Bow range is now enforced for player arrows. | Treat these as current behavior. Change only within an explicit gameplay task and verify balance. |

## Current loot, Fire Ring, and Lantern Order (2026-10-30)

- Enemy.destroy guards against duplicate deaths, drops one 3–6 coin Item and has a 25% chance of a small-health Item (+5 HP). Coins add to both purse and total earned gold. Regular health potions heal 25 HP. Dead pickups cannot award twice.
- Fire Ring is owned for the run: successful weapon hits trigger five seconds of 8 direct damage every 0.5 seconds to all living enemies within 70px and clear line of sight. Trigger cooldown is 20 seconds from activation. Direct ring damage cannot trigger Storm Spark or the ring recursively. Filled orange area and flame marks show coverage. Active time and cooldown reset on descent; ownership resets per run.
- Keep skill-meter and skill-status below vitality aligned with updateStats. Recharge fills from 0 to 20; text shows active time, cooldown, ready-on-hit, no skill, or passive Storm Spark. Shop/death pause simulation and feedback timers. offer-storm/offer-fire article IDs and purchase buttons must match JavaScript; CSS explicitly hides unavailable offers.
- Dungeon.spawn is reserved before enemy placement. Every enemy center starts at least 280px from the player center; initial Player and later-floor repositioning use this same reserved arrival. Floor one starts at (45,125). Random pickups stay outside the puzzle alcove.
- createLanternPuzzle carves connected tiles x=1..5, y=1..3 and invalidates terrain. Three Lantern entities and LanternNiche belong to room.puzzle. Fisher–Yates shuffles [0,1,2] once per run; attempts and shop visits retain the order. The plaque only names the puzzle; puzzle-status shows instructions/progress without the solution.
- E selects the nearest lantern within 45px and line of sight. Correct choices stay lit. A wrong choice resets progress and sets errorUntil=runTime+0.7; all lanterns pulse red until that simulation-time deadline. Completion once opens the niche and spawns a lantern-heart Item. The exit never requires completion.
- Collecting Lantern Heart sets player.lanternHeart: each enemy death heals 5 HP once, capped at max and only while the player is alive, including perk kills. Ownership survives floors and resets on retry. perk-stat lists owned perks and the heart.
- Latest gameplay verification: 66 offline Node tests passed; spawn coverage includes 20 seeds through 12 floors. Isolated Edge verified real E taps, wrong-order red flash, randomized solve, reward/healing, descent, and responsive layouts with API blocked. Desktop/phone and red-flash screenshots were inspected. Long-run balance still needs playtesting. No gameplay commits or deployment.

## Touch input and mobile view (working tree, 2026-10-30)

- touchKeys stores only held touch directions, independently of keyboard keys. inputDown combines both sources for movement/aim. Touch button clicks queue keys.switch/interact, preserving existing cooldowns, weapon selection, and puzzle rules. updateStats updates touch-weapon with equipped weapon/ammo.
- setupTouchPad installs Pointer Events with one captured pointer per pad, 12px deadzone, and eight directions. Two pads accept separate fingers simultaneously. pointerup/pointercancel/lostpointercapture clear only that pad; resetKeys clears both pads, keyboard state, and captures on blur/hidden/shop/death/retry. Ignore new game gestures during shop/game over.
- Keep move-pad/aim-pad, their -thumb spans, touch-switch, touch-interact, touch-weapon, touch-controls, and game-viewport IDs aligned. Touch styling uses any-pointer:coarse; narrow touch layout <=1100px keeps only game view and controls within 100svh. #ui-layer, #player-stats, and #leaderboard are hidden with display:none; their DOM IDs remain for shared update code. Shop and game-over screens remain available. Pads use touch-action:none; tap buttons manipulation. Do not disable page zoom globally.
- Desktop retains the whole-room canvas and keyboard controls. Touch view crops the enlarged canvas inside game-viewport; animate adjusts scrollLeft/scrollTop to follow player when canvas overflows either dimension. CSS container height units keep tiles large enough to fill available space without changing world physics. Controls stay outside the play area.
- Latest verification:69 offline Node tests passed, including multitouch separation/cancellation, deadzone, keyboard coexistence, and shop/retry cleanup. Isolated Edge touch emulation verified simultaneous fingers, bow ammo, switch/lantern taps, camera tracking, shop return/retry, 320/390px portrait,844px landscape,768px tablet, and hidden controls on desktop; no errors/overflow. Portrait/landscape screenshots inspected. Later minimal-mobile layout check confirmed hidden HUD/sidebars at all four sizes, desktop panels visible, and shop/retry still usable. Physical Android/iPhone/Safari and comfort/performance remain untested; no deployment or real API writes.

## Maintaining this memory

When fixing a pitfall, replace the unresolved entry with the implemented behavior and verification. Save durable decisions and reproducible solutions, not temporary progress logs, guesses, credentials, or personal data. Keep API contracts aligned with source and distinguish local checks from remote verification.
