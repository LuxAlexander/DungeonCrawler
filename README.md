# DungeonCrawler

A keyboard-controlled dungeon survival game by Alexander Lux, built with plain JavaScript and HTML Canvas. Explore randomly generated labyrinths as a penguin, fight slimes, collect upgrades, and submit your score online. A portfolio project for practicing programming and AI-assisted development.

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

Gameplay runs locally without a backend. No separate local backend or development database is required. The game still attempts requests to its previously configured API address, so leaderboard loading and saving are unavailable while that backend is undeployed. Initial entries are placeholders, not cached scores. When the service is deployed again, local score submissions will target that remote service.

## Controls

| Key | Action |
| --- | --- |
| W / A / S / D or arrow keys | Move (letter keys must be lowercase) |
| Space (hold) | Attack repeatedly |
| Q | Cycle collected weapons |
| Retry | Start another run after game over |
| Submit | Send the finished run's name, enemies slain, and gold, then restart |

The bow fires in the last successful movement direction, initially right. There are no touch controls.

## Gameplay

- Each floor generates a maze with four slimes and three random pickups. Slimes pursue nearby players, deal contact damage, and shoot goo that creates slowing puddles on wall impact.
- Start with 100 health and a sword. The sword deals 25 damage to nearby enemies; the collectible bow fires arrows dealing 20 damage. Both share a 0.4-second attack cooldown.
- Health pickups restore up to 50 health, speed pickups increase speed for the current run, and bow pickups add a ranged weapon. Pickups are automatic; health pickups are consumed even at full health.
- Clearing all enemies creates a chest. Approach it to collect 50 gold once per floor.
- Reach the brown door on the right to enter another floor and restore full health. Clearing enemies and collecting the chest are not required to exit.
- Each kill increases difficulty for future enemy spawns. Score counts enemies slain; gold is tracked separately.
- At zero health, enter a name of up to 10 characters and submit, or retry. Blank names become `Unknown`.

## Project structure

| Path | Purpose |
| --- | --- |
| `frontend/index.html` | Canvas, HUD, inventory, game-over form, leaderboard; loads `game.js` |
| `frontend/game.js` | Input, procedural generation, entities, combat, rendering, UI, and API requests |
| `frontend/styles.css` | Presentation, HUD, overlay, and fixed leaderboard sidebar |
| `frontend/images/` | Penguin and chest sprites plus favicon (`.ico`) |
| `frontend/drawing.js` | Unused drawing experiment with unfinished example code; not loaded |
| `backend/` | Express API, MongoDB connection, package manifest and lockfile |
| `netlify.toml` | Frontend deployment configuration |
| `backend/railway.json` | Backend deployment configuration |
| `AGENTS.md` | Maintenance guidance, session memory, validation, and pitfalls |

## Leaderboard integration

The Express/MongoDB backend is in `backend/`. Both frontend request URLs remain hardcoded near the bottom of `frontend/game.js`; update both when choosing a new backend address.

| Method | Endpoint | Frontend contract |
| --- | --- | --- |
| GET | `https://jsgame-production.up.railway.app/api/leaderboard` | JSON array with `name`, `score`, and optional `gold` (defaults to 0) |
| POST | `https://jsgame-production.up.railway.app/api/submit-score` | JSON body: `{ "username": "Player", "score": 12, "gold": 50 }` |

Submission uses `username`, whereas display expects `name`. Remote entries appear in server order. The backend must allow the frontend origin through CORS. Backend credentials are supplied through deployment environment variables, never committed.

## Development and validation

Edit the source and reload the browser. Keep DOM IDs synchronized between HTML and JavaScript. With Node.js installed, check syntax using:

```powershell
node --check frontend/game.js
npm --prefix backend run check
```

There is no automated test suite or formatter configuration. Only the backend has Node.js dependencies. For gameplay changes, manually check movement/walls, both weapons, pickups, chest rewards, floor transitions, game over, and retry. Inspect the console and test leaderboard failure handling. Mock API responses for submission tests to avoid adding test scores to production.

Known limitations include incomplete restart-state resets, a maze taller than the canvas, a fixed sidebar that can overlap gameplay, and limited HTTP error handling. See `AGENTS.md` for causes and proposed solutions. Serve only `frontend/` publicly; never publish the repository root or backend environment files.

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
