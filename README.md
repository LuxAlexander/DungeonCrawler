# DungeonCrawler

A keyboard-controlled dungeon survival game by Alexander Lux, built with plain JavaScript and HTML Canvas. Explore randomly generated labyrinths as a penguin, fight slimes, collect upgrades, and save your score locally or submit it online. A portfolio project for practicing programming and AI-assisted development.

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
| Arrow keys (hold) | Select and fire a collected bow in that direction |
| Horizontal + vertical arrow | Fire diagonally (for example Up + Right) |
| Space (hold) | Attack repeatedly |
| Q | Cycle collected weapons |
| Retry | Start another run after game over |
| Submit | Save the run locally, attempt online submission, then restart |

The sword swings in a forward arc. Arrow keys aim and fire the bow independently of WASD movement; you must collect a bow first. Space also attacks with the equipped weapon in the last movement/aim direction, initially right. There are no touch controls.

## Gameplay

- Each floor generates a maze with four slimes (at least one Moss, Ember, and Tide) and three random pickups. Slimes follow paths through corridors to pursue nearby players, roam when farther away, and shoot goo that creates slowing puddles on wall impact.
- Slime melee attacks show an amber warning ring and exclamation mark for 0.4 seconds, then strike once for 12 damage if you remain in range. A red ring marks the strike; move away to dodge. Hits give the player 0.7 seconds of protection from further damage.
- Damage flashes, floating numbers, and a red canvas border show successful hits.
- Start with 100 health and a sword. The sword deals 25 damage in a forward arc (walls block it) with an animated crescent trail; the collectible bow fires glowing, directional arrows dealing 20 damage with a 300-pixel range. Both share a 0.4-second attack cooldown.
- Health pickups restore up to 50 health, speed pickups increase speed for the current run, and bow pickups add a ranged weapon. Pickups are automatic; health pickups are consumed even at full health.
- Clearing all enemies creates a chest. Approach it to collect 50 gold once per floor.
- Reach the rune-lit stone-and-brass door on the right to open the optional floor shop. Buy upgrades, descend without buying, or return for missed loot. Descending restores full health. Clearing enemies and collecting the chest are not required to exit.
- Every deeper floor increases enemy health and melee damage, plus movement and shooting speed. Rushing without kills still increases difficulty; kills themselves do not. Score counts enemies slain; gold is tracked separately.
- At zero health, enter a name of up to 10 characters and submit, or retry. Blank names become `Unknown`.

## Exit shop and run upgrades

The glowing exit opens **The Wayfarer's Rest**, a paused shop before the next floor. Combat, hazards, projectiles, and run time pause while it is open. No purchase is required. Return to the current floor (or press Escape) to collect missed loot; step away from the door before approaching it again.

| Upgrade | Price | Effect |
| --- | --- | --- |
| Heartstone | 25 gold | +10 maximum health; stacks |
| Honed Steel | 50 gold | +5 damage to sword and bow, including a bow collected later; stacks |
| Storm Spark | 150 gold | Weapon hits chain to one visible slime within 90px for 50% damage; one per run |

Upgrades survive floor changes and reset on a new run. Descending refills health to the upgraded maximum. Storm Spark cannot chain through walls or recursively trigger itself. Prices/effects are initial balance choices.

The HUD **purse** is spendable gold. The side panel and leaderboard retain **total gold earned**, so buying upgrades does not reduce your recorded gold result. A cleared floor's chest still grants 50 gold.

Optional puzzle concepts are recorded in [docs/puzzles.md](docs/puzzles.md). They are proposals, not implemented obstacles or rewards.

## Floor difficulty

Floor 1 starts with 100 enemy health and 12 melee damage. Each deeper floor adds 12 health and 1 melee damage. Movement rises from 96 world pixels/second by 3.6 per floor, capped at 168. Goo/elemental shot intervals gradually shorten to 55% of their original duration. Enemy count stays four, the 0.4-second melee warning stays readable, and environmental fire still deals 8 damage per pulse. New runs reset the scaling.

For example, floor 2 has 112-health enemies dealing 13 melee damage; floor 6 has 160-health enemies dealing 17. The left panel displays enemy health percentage and melee damage. These are initial tuning values to playtest alongside loot/progression.

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

The Express/MongoDB backend is in `backend/`. Both frontend request URLs remain hardcoded near the bottom of `frontend/game.js`; update both when choosing a new backend address.

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
```

Frontend regression tests use a mocked browser environment without network/database access; actual layout and game feel still need browser playtesting. There is no formatter configuration. Only the backend has Node.js dependencies. For gameplay changes, manually check movement/walls, both weapons, pickups, chest rewards, floor transitions, game over, and retry. Inspect the console and test leaderboard failure handling. Mock API responses for submission tests to avoid adding test scores to production.

Known limitations include unverified client-submitted scores, puzzle generation not yet implemented, and run balance still needing playtesting. See `AGENTS.md` for causes and proposed solutions. Serve only `frontend/` publicly; never publish the repository root or backend environment files.

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
- Update both frontend API URLs if the backend hostname changes, then verify the leaderboard. Only submit a real score or an explicitly authorized test score.

The combined GitHub repository is **DungeonCrawler**. Both original Git histories are preserved through a merge commit, with no history rewrite. The migration branch is `codex/dungeoncrawler-monorepo`; the local checkout remains named `JS_Game`. The origin URL is `https://github.com/LuxAlexander/DungeonCrawler.git`. The original backend checkout remains intact. The owner approved retiring the old GitHub backend repository after merging the migration. Hosted deployment reconnection is still a separate step; the backend is currently undeployed.
