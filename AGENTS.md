# Project memory and maintenance guide

Applies to the whole repository. Preserve verified facts, workflows, decisions, and reproducible pitfalls here across sessions. Update this file and README when behavior changes. Proposed solutions below are not implemented fixes.

## Accepted decisions (2026-10-28)

- Product name: **DungeonCrawler**. Goal: portfolio project and practice in programming and AI-assisted development.
- The owner makes high-level decisions and authorizes the assistant to implement code; do not assume the owner wants to write features as exercises.
- Combine frontend and backend in this repository, preserving both histories and separate deployments. The owner explicitly approved deleting the old GitHub JS_Backend repository after merging; keep the original local backend checkout intact.
- This migration covers structure, docs, local setup, and deployment configuration. Existing gameplay defects are deferred.
- The backend is currently undeployed. Do not provision a separate local backend or development database unless requested.
- GitHub repository renamed to LuxAlexander/DungeonCrawler; origin updated. Owner approved publishing and merging the migration to main. Deployment reconnection remains pending. The local checkout remains named JS_Game.

## Baseline (inspected 2026-10-28)

- Static HTML/CSS/JavaScript frontend in `frontend/`; Express/MongoDB backend in `backend/`. No frontend framework or build step; dependencies and lockfile live only in the backend. No automated test suite.
- `frontend/index.html` loads only `game.js` as a classic script at the end of the body, after all required markup.
- `frontend/game.js` owns the runtime. Section comments organize input, helpers/UI, tiles/rooms/dungeon, entities/items/living actors, weapons/projectiles, player/enemies/goo, chest/door, and engine/API code.
- `frontend/styles.css` owns presentation. Sprites are `images/pengu.ico` and `images/chest.ico`; favicon is `images/favicon.ico`.
- `frontend/drawing.js` is an unreferenced experiment, not another game entry point.
- Backend imported from https://github.com/LuxAlexander/JS_Backend with all three original commits preserved as merge ancestry. Root `netlify.toml` publishes only `frontend/`; `backend/railway.json` configures the API service.

## Runtime relationships

- Global `dungeon`, `player`, and `arrows` connect most classes. `initGame()` constructs the dungeon before assigning the new player. `Dungeon.nextLevel()` checks the existing player global when repositioning it; initialization order matters.
- `animate()` uses one continuing `requestAnimationFrame` loop, caps delta time at 0.1 seconds, updates the room before the player, then updates projectiles in reverse. Retry reuses the loop; do not start another.
- `Room.update()` draws tiles/doors, filters dead entities, updates entities, then spawns a chest if neither enemies nor a chest remain. `Door.draw()` can replace the room as a side effect.
- Room entities include enemies, items, chests, and goo puddles. Global `arrows` holds both player arrows and enemy goo shots. Death sets a flag before later removal.
- Movement uses elapsed seconds multiplied by 60. Enemy wandering/shooting probabilities are per frame and remain frame-rate dependent.
- Each kill increases difficulty by 0.05 for newly constructed enemies. Floor changes preserve inventory, speed, score, and gold and restore health.
- Required DOM IDs: `space`, `slain-count`, `hp-count`, `gold-count`, `inventory-list`, `log`, `leaderboard-list`, `game-over-overlay`, `final-score`, `player-name`, `submit-btn`, `retry-btn`. The game currently selects the first canvas rather than its ID.

## Workflow and validation

1. Inspect the relevant code and working tree; preserve unrelated changes.
2. Follow the existing plain JavaScript classes and section organization. Avoid adding tooling solely for small maintenance work.
3. After runtime edits, run `node --check frontend/game.js` and `npm --prefix backend run check`. This checks parsing, not browser behavior.
4. Serve the root with `py -m http.server 8000 --directory frontend` and open `http://localhost:8000`. Directly opening `frontend/index.html` also runs gameplay; HTTP provides a predictable origin.
5. For gameplay changes, check startup/sprites, movement/walls, sword kills, bow pickup/switch/direction, health/speed, goo slow, chest reward once per floor, door healing, death overlay, and retry. Use controlled state/randomness when reproducing random-room defects.
6. Inspect console/network errors. Mock API requests during submission tests; requests still target the old remote URL even though the backend is currently undeployed. Do not send dummy scores without explicit authorization.
7. Report actual verification and limitations. No automated gameplay harness currently exists.

## Backend maintenance

- Read `backend/AGENTS.md` before backend changes. CommonJS modules, Express 5, MongoDB 7; Node.js minimum 20.19 (driver requirement).
- Use `npm --prefix backend ci` for dependencies. `npm --prefix backend run check` parses all backend source. No database is needed for this check.
- Use hosting variables for PORT, ATLAS_URI, DB_NAME; `backend/.env.example` contains placeholders only. Never copy the old .env or node_modules into version control.
- Deployment details and GitHub migration status are in README. The local migration branch is `codex/dungeoncrawler-monorepo`. Do not squash/rewrite its history if preserving both original histories.

## Backend contract

- Hardcoded base URL: `https://jsgame-production.up.railway.app`.
- GET `/api/leaderboard`: array with `name`, `score`, optional `gold`. Remote entries use server order; the separate placeholder renderer sorts its own array by score.
- POST `/api/submit-score`: JSON `{ username, score, gold }`, with `Content-Type: application/json`. Preserve the `username`/`name` distinction unless coordinating a contract change.
- Names are trimmed; empty names become `Unknown`. HTML limits input to 10 characters; this is not server validation.
- Remote availability and CORS configuration were not verified during this documentation update.

## Pitfalls and proposed solutions

| Pitfall / cause | Solution when addressing it |
| --- | --- |
| `initGame()` does not reset difficulty, keys, or timing. `hasBow` resets in the game-over animation branch. | Centralize run-state resets before dungeon construction. Verify baseline difficulty, sword-only inventory, neutral input, and fresh timing on retry. |
| Game-over frames still call `Room.update()`, so simulation and side effects continue behind the overlay. | Separate rendering from simulation or gate updates after death; preserve a single animation loop. |
| `Room(25, 12, 40)` rounds rows to 13: a 1000 x 520 maze on a 1000 x 500 canvas. Collision checks walls but not explicit world bounds. | Match canvas/room geometry and enforce world bounds. Verify actor and projectile edges. |
| Door at x=960 overlaps the boundary wall and triggers on proximity without enemy/chest gating. | Verify approachability after generation/collision edits. Implement explicit exit state and a walkable doorway if gating is requested. |
| Floor changes leave projectiles alive and occur inside the old room's update. | Clear or deliberately transfer projectiles; defer transitions to an update boundary to avoid mixed-room effects. |
| HP text refreshes only when `updateUI()` runs, not on every hit. Door healing happens after its UI update. | Refresh on health changes or synchronize HUD after simulation; check damage and floor healing. |
| Neither fetch checks `res.ok`; HTTP failures do not throw automatically. Submission restarts even after network failure. | Check status/response shape, show errors, and preserve the finished run for retry if saving fails. |
| Leaderboard names enter `innerHTML` in both renderers. | Build elements with `textContent` for untrusted values and validate API response types. |
| `leaderboardData` remains placeholder data after GET. Restart can overwrite remote results temporarily. | Use one data source and renderer with explicit loading/error states. |
| Keyboard listeners are global, case-sensitive, lack blur reset, and do not prevent arrow/Space scrolling. They also react while typing names. | Normalize keys, ignore editable fields, prevent defaults for active game controls, and clear input on blur/death/restart. |
| `drawing.js` redeclares top-level `canvas` and uses undefined `start`, `end`, `theta`, and `brush`. | Keep it unloaded until its scope is isolated and unfinished example code is replaced. Parsing checks will not detect these runtime faults. |
| A 600px wrapper surrounds a 1000px canvas; the fixed 220px sidebar plus padding can overlap gameplay. Wrapper CSS is duplicated. | Coordinate canvas display scale, wrapper width, and sidebar breakpoints. Preserve canvas coordinates and consolidate duplicate rules when changing layout. |
| `slimegreen` is an invalid CSS color in leaderboard markup. | Replace in both renderers with a valid color, preferably through a CSS class. |
| Pickups can overlap entities; full-health potions are consumed. `Bow.range` does not control arrow lifetime. | Treat these as current behavior. Change only within an explicit gameplay task and verify balance. |

## Maintaining this memory

When fixing a pitfall, replace the unresolved entry with the implemented behavior and verification. Save durable decisions and reproducible solutions, not temporary progress logs, guesses, credentials, or personal data. Keep API contracts aligned with source and distinguish local checks from remote verification.
