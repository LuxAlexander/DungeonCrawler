# DungeonCrawler

A keyboard- and touch-controlled dungeon survival game by Alexander Lux, built with plain JavaScript and HTML Canvas. Explore randomly generated labyrinths as a penguin, fight slimes, collect upgrades, and save your score locally or submit it online. A portfolio project for practicing programming and AI-assisted development.

- [Live demo](https://alexanderlux.netlify.app)
- [Source repository](https://github.com/LuxAlexander/DungeonCrawler)
- [Leaderboard API](https://jsgame-production.up.railway.app/api/leaderboard)

The backend is currently **undeployed** (owner confirmed 2026-10-28). The API link is the previously configured address, not a working-service guarantee.

## Run locally

There are no packages to install and no build step. Open `frontend/index.html` in a modern desktop browser, or serve this directory over HTTP. With Python installed on Windows:

```powershell
py -m http.server 8000 --directory frontend
```

Then open [localhost:8000](http://localhost:8000). Without the Windows Python launcher, use `python -m http.server 8000 --directory frontend` or `python3 -m http.server 8000 --directory frontend`.

Gameplay runs locally without a backend. No separate local backend or development database is required. The game attempts the previously configured API address with a three-second deadline. When it cannot connect, the leaderboard shows real scores saved in this browser. Submit saves locally even if online saving fails. When the service returns, its leaderboard is shown again; previous local scores are not automatically uploaded.

## Controls

| Key | Action |
| --- | --- |
| W / A / S / D | Move (uppercase letters also work) |
| Arrow keys (hold) | Attack with the equipped weapon in that direction |
| Horizontal + vertical arrow | Attack diagonally (for example Up + Right) |
| Space (hold) | Attack repeatedly |
| Q | Cycle collected weapons |
| E | Interact with the nearest puzzle object within reach |
| Retry | Start another run after game over |
| Submit | Save the run locally, attempt online submission, then restart |

The sword swings in a forward arc. Arrow keys aim and attack with the equipped sword or bow independently of WASD movement. Q switches weapons; arrows never auto-select the bow. Space also attacks with the equipped weapon in the last movement/aim direction, initially right. Touch controls appear automatically on devices with a coarse pointer, such as phones and tablets.

## Play on a phone or tablet

Open the game in a modern mobile browser. The **left thumb pad moves** and the **right pad aims and repeatedly attacks** with the equipped weapon. Drag diagonally for diagonal movement or attacks. Release a pad to stop. Both pads work simultaneously. Tap the **sword with swap arrows** icon to choose sword/bow. The weapon label includes remaining bow ammo. Tap the **hand** icon to interact with a nearby puzzle object. Shop, retry, and score buttons support taps.

On touch screens up to 1100px wide, only the dungeon and essential touch controls fill the screen in portrait or landscape. The title, HUD, puzzle messages, stats sidebar, and leaderboard are hidden. The enlarged dungeon view follows the player; weapon/ammo remain beside the icon buttons, and health feedback stays on the player. Shop and game-over screens appear when needed. The control bar is a transparent overlay on the dungeon; joysticks and icon buttons are translucent so the floor stays visible underneath. Buttons keep accessible names for screen readers. Landscape provides a wider view. Dragging the pads does not scroll the page; scrolling and browser zoom remain available outside them.

Verification used emulated touch gestures in Edge, including simultaneous fingers, camera tracking, portrait/landscape layouts, and tap actions. Physical Android/iPhone comfort, performance, and Safari behavior still need device testing. Changes remain local and uncommitted; the live demo has not been updated.

## Gameplay

- Player arrivals are reserved before enemy placement: every enemy starts at least 280 world pixels from the player, including on retry and descent.
- Each floor generates a maze with four slimes initially (at least one Moss, Ember, and Tide), three pickups, and two arrow bundles. On floor one, one pickup is always a bow at a marked **Armory** beyond the Lantern alcove. Slimes follow paths through corridors, pursue nearby players, and roam when farther away. Their elemental shots create matching patches on wall or player impact.
- Standard slime melee attacks show an amber warning ring and exclamation mark for 0.4 seconds, then strike once for 12 damage on floor one (+1 per deeper floor) if you remain in range. A red ring marks the strike. Move away to dodge. Hits give the player 0.7 seconds of protection from further damage.
- Damage flashes, floating numbers, and a red canvas border show successful hits.
- Ordinary slimes drop 3–6 coins and have a 25% chance to drop a small potion healing 5 HP. Collect loot by approaching it. Small potions remain while health is full. Coins add to both purse and total earned gold.
- Flying slime shots deal 6 damage on contact, disappear on impact, leave their matching ground patch even when hit protection blocks damage, and respect walls.
- Start with 100 health and a sword. The sword deals 25 damage in a forward arc (walls block it) with an animated crescent trail; the collectible bow fires glowing, directional arrows dealing 20 damage with a 300-pixel range. Both share a 0.4-second attack cooldown.
- Health pickups restore up to 25 health, speed pickups increase speed for the current run, and the first bow pickup adds a ranged weapon and 8 arrows. Each arrow bundle grants 6 arrows, collectible even before finding a bow. Every bow shot spends one arrow; empty bows cannot fire. Ammo persists between floors and resets on a new run; the sidebar shows the remaining arrows. Pickups are automatic; ordinary floor potions are consumed even at full health, while small enemy-drop potions wait until health is missing.
- Clearing all enemies places a chest beside the exit. Approach it for 50 gold and unlock a free choice at the shop: **Slimeforged Edge** (+2 weapon damage), **Explorer's Quiver** (+12 arrows), or **Guild Bounty** (+25 gold). Take at most one boon per floor, separately from the paid upgrade.
- Reach the rune-lit stone-and-brass door on the right to open the optional floor shop. Buy upgrades, descend without buying, or return for missed loot. Descending restores 30 health, capped at maximum. Clearing enemies and collecting the chest are not required to exit.
- Every deeper floor increases enemy health and melee damage, plus movement and shooting speed. Rushing without kills still increases difficulty; kills themselves do not. Score counts enemies slain; gold is tracked separately.
- At zero health, enter a name of up to 10 characters and submit, or retry. Blank names become `Unknown`.

## Exit shop and run upgrades

The glowing exit opens **The Wayfarer's Rest**, a paused shop before the next floor. Combat, hazards, projectiles, and run time pause while it is open. No purchase is required. Return to the current floor (or press Escape) to collect missed loot; step away from the door before approaching it again.

| Upgrade | Price | Effect |
| --- | --- | --- |
| Heartstone | 25 gold | +5 maximum health; stacks across floors |
| Honed Steel | 50 gold | +5 damage to sword and bow, including a bow collected later; stacks |
| Storm Spark | 150 gold | Weapon hits chain to one visible slime within 90px for 50% damage; one per run |
| Fire Ring | 150 gold | Weapon hits trigger a five-second ring, dealing 8 damage every 0.5 seconds to enemies within 70px and clear line of sight; 20-second trigger cooldown; one per run |

Upgrades survive floor changes and reset on a new run. Only one upgrade may be purchased per floor, including after returning and reopening the shop. Descending restores 30 health up to the upgraded maximum. Storm Spark cannot chain through walls or recursively trigger itself. The special slot randomly offers Storm Spark or Fire Ring each floor; it stays fixed on reopening. Both can be owned across floors. Fire Ring follows the player, affects every enemy inside its 70px radius with clear line of sight, and shows a filled orange area plus flame marks on affected slimes. The skill bar beneath vitality shows active time, recharge, or ready-on-hit state (and identifies Storm Spark as passive when it is the only perk). Fire Ring pauses in the shop, and its active effect clears on descent. Prices/effects are initial balance choices.

The HUD **purse** is spendable gold. The side panel and leaderboard retain **total gold earned**, so buying upgrades does not reduce your recorded gold result. A cleared floor's chest still grants 50 gold.

## New enemies and the Slime King

| Enemy | First appears | Attack |
| --- | --- | --- |
| Skipper | Floor 2 | Marks a landing zone and leaps there. Move out of the marked circle before it lands. |
| Prism | Floor 3 | Holds at range and draws three dashed aim lines before firing a spread of goo shots. |
| Slime King | Floor 4, then every fourth floor | Guards an arena with a sweeping slam and spread shots. At half health, the spread widens to five fire shots. |

The King is optional. Defeat him and collect his crown for **+10 maximum HP, 25 HP restored**, and a separate **25 gold** drop. Crowns from later encounters stack for the current run.

## Puzzles and secrets

- **Floor 1 — Lantern Order.** Find the shuffled sequence by activating the three lanterns. A wrong choice resets the sequence and flashes red. Collect the **Lantern Heart** to heal 5 HP per kill.
- **Floor 2 — Rune Circuit.** Turn the stones until the lit route reaches the far end. Collect the **Tempered Shard** for +3 sword and bow damage, including bows picked up later.
- **Floor 3 — Hidden cache.** Look for unusual stonework. The **Mossstep Charm** lets you keep 75% of normal movement speed in goo, up from 50%.

Press **E** or tap the **hand** icon when close. These rewards last through the current run. See [puzzle details](docs/puzzles.md) for implementation notes.

## Floor difficulty

Floor 1 starts with 100 base enemy health and 12 base melee damage. Each deeper floor adds 12 base health and 1 melee damage. Standard movement rises from 96 world pixels/second by 3.6 per floor, capped at 168. Goo/elemental shot intervals gradually shorten to 55% of their original duration. The normal enemy count starts at four and grows by one every two floors, capped at 12 plus the King on boss floors. Environmental fire deals 8 damage per pulse. New runs reset the scaling.

On floor 2, a standard slime has 112 health and deals 13 melee damage. The left panel displays the base health percentage and melee damage. Skipper starts with 70% of base health and Prism with 80%. The King has triple base health and 9 extra melee damage. These are initial values for playtesting.

## Dungeon look and elemental slimes

Mossy masonry, worn flagstones, torch sconces, and a dark forest-toned backdrop replace the flat maze. Terrain is cached once per floor so the decorative details do not need to be redrawn tile by tile every frame. The expedition HUD shows depth, a live vitality bar, kills, gold, inventory, and the current floor objective.

| Slime | Appearance | Ground effect |
| --- | --- | --- |
| Moss | Green, bright brow | Goo slows movement |
| Ember | Orange, flame crest | Fire burns for 8 damage in pulses about 0.9 seconds apart while standing on it |
| Tide | Blue, droplet crest | Water carries you forward with momentum and reduced steering; momentum fades after leaving |

Elemental shots create patches when they hit walls. Ember and Tide slimes also leave trails while moving and a patch when defeated. Patches last six seconds, fade before expiring, stay inside walkable tiles, and refresh rather than stack when the same element lands on the same tile. Fire shares the player's brief hit protection so overlapping flames cannot stack damage every frame. Sliding respects walls and clears between floors. The left panel shows Burning, Sliding, or Slowed as appropriate.

## Movement and run stats

The penguin slides along walls when moving diagonally. Movement stops at walls and room boundaries, including at high speed. The full maze fits the canvas.

A left sidebar shows floor, run time, health, enemies remaining, selected weapon and damage, movement speed, and slowing effects. Speed is measured in world pixels per second, so resizing the canvas does not change it. The leaderboard stays on the right; both panels move below the game on narrow windows. Health updates live. Runs freeze at game over and retry resets their stats.

## Project structure

| Path | Purpose |
| --- | --- |
| `frontend/index.html` | Canvas, HUD, inventory, game-over form, leaderboard; loads `game.js` |
| `frontend/game.js` | Input, procedural generation, entities, combat, rendering, UI, and API requests |
| `frontend/styles.css` | Presentation, HUD, overlay, and fixed leaderboard sidebar |
| `frontend/images/` | Penguin and chest sprites plus favicon (`.ico`) |
| `frontend/drawing.js` | Unused drawing experiment with unfinished example code; not loaded |
| `backend/` | Express API, MongoDB connection, package manifest and lockfile |
| `tests/game.test.cjs` | Headless regression checks using the built-in Node.js test runner |
| `docs/` | Agreed design decisions, open ideas, and implementation history; start with [docs/README.md](docs/README.md) |
| `netlify.toml` | Frontend deployment configuration |
| `backend/railway.json` | Backend deployment configuration |
| `AGENTS.md` | Maintenance guidance, session memory, validation, and pitfalls |

## Leaderboard integration

The Express/MongoDB backend is in `backend/`. The shared API base URL is hardcoded in `apiRequest()` in `frontend/game.js`; update it when choosing a new backend address.

| Method | Endpoint | Frontend contract |
| --- | --- | --- |
| GET | `https://jsgame-production.up.railway.app/api/leaderboard` | JSON array with `name`, `score`, and optional `gold` (defaults to 0) |
| POST | `https://jsgame-production.up.railway.app/api/submit-score` | JSON body: `{ "username": "Player", "score": 12, "gold": 50 }` |

Submission uses `username`, whereas display expects `name`. Entries are displayed by kills descending, then gold descending, up to ten. The backend must allow the frontend origin through CORS. Backend credentials are supplied through deployment environment variables, never committed.

## Local leaderboard

Every submitted run keeps a local backup under `dungeoncrawler.scores.v1` in browser localStorage. The local top ten is ranked by kills, then gold. The panel explicitly indicates whether you are viewing online, local browser, or session-only scores.

Scores belong to the current browser profile and site origin; localhost, a file URL, and the deployed site do not share them. Clearing site data removes them. If browser storage is blocked/full, scores remain available only for the current page session. Malformed saved data does not prevent startup. Local scores are never silently uploaded or combined with the remote leaderboard.

Network errors, HTTP failures, invalid responses, and request timeouts fall back to local scores. Names are rendered as text. Submission disables the buttons while saving to prevent duplicate clicks.

## Development and validation

Edit the source and reload the browser. Keep DOM IDs synchronized between HTML and JavaScript. With Node.js installed, check syntax using:

```powershell
node --check frontend/game.js
npm --prefix backend run check
node --test tests/game.test.cjs
```

The latest gameplay validation passed 69 offline regression tests and isolated browser checks for Lantern Order, reward healing, descent, and responsive layouts. These results apply to the uncommitted working tree, not a verified deployment.

Frontend regression tests use a mocked browser environment without network/database access; actual layout and game feel still need browser playtesting. There is no formatter configuration. Only the backend has Node.js dependencies. For gameplay changes, manually check movement/walls, both weapons, pickups, chest rewards, floor transitions, game over, and retry. Inspect the console and test leaderboard failure handling. Mock API responses for submission tests to avoid adding test scores to production.

Known limitations include unverified client-submitted scores and run balance still needing playtesting. See `AGENTS.md` for maintenance notes. Serve only `frontend/` publicly.

## Backend deployment

The backend uses Express 5 and MongoDB driver 7. It requires Node.js 20.19 or newer; use a supported Node.js LTS release. Install its locked dependencies with:

```powershell
npm --prefix backend ci
```

Configure these variables in the hosting service (see `backend/.env.example` for placeholders):

| Variable | Purpose |
| --- | --- |
| `PORT` | HTTP listening port; Railway supplies this |
| `ATLAS_URI` | MongoDB connection URI |
| `DB_NAME` | MongoDB database name; scores use the `Scores` collection |

Start command: `npm start`, with `backend/` as the working directory. No local database or backend service is provisioned by this migration. The optional `npm run dev` uses Node's built-in watch mode.

## Hosting and migration

One Git repository contains two separately deployed components:

- **Netlify:** connect the combined repository and branch, leave the repository root as the base directory, and publish `frontend`. The root `netlify.toml` records this. No frontend build is needed.
- **Railway:** connect the same repository and branch, set the service root to `/backend`, and explicitly set the config file path to `/backend/railway.json`. It installs locked dependencies and starts with `npm start`. Set the variables above and provision access to your MongoDB database.
- Update the shared frontend API base URL if the backend hostname changes, then verify the leaderboard. Only submit a real score or an explicitly authorized test score.

The combined GitHub repository is **DungeonCrawler**. Both original Git histories are preserved through a merge commit, with no history rewrite. The migration branch is `codex/dungeoncrawler-monorepo`; the local checkout remains named `JS_Game`. The origin URL is `https://github.com/LuxAlexander/DungeonCrawler.git`. The original backend checkout remains intact. The owner approved retiring the old GitHub backend repository after merging the migration. Hosted deployment reconnection is still a separate step; the backend is currently undeployed.
