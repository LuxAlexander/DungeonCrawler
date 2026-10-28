# Dungeon Explorer

A keyboard-controlled dungeon survival game by Alexander Lux, built with plain JavaScript and HTML Canvas. Explore randomly generated labyrinths as a penguin, fight slimes, collect upgrades, and submit your score online. The browser tab title is **Labyrinth Explorer**.

- [Live demo](https://alexanderlux.netlify.app)
- [Backend repository](https://github.com/LuxAlexander/JS_Backend)
- [Leaderboard API](https://jsgame-production.up.railway.app/api/leaderboard)

These are the project's configured links; service availability has not been verified.

## Run locally

There are no packages to install and no build step. Open `index.html` in a modern desktop browser, or serve this directory over HTTP. With Python installed on Windows:

```powershell
py -m http.server 8000
```

Then open [localhost:8000](http://localhost:8000). Without the Windows Python launcher, use `python -m http.server 8000` or `python3 -m http.server 8000`.

Gameplay runs locally. Internet access is required for the remote leaderboard. Local runs still use the production backend, so submitting a score sends it to that service. On network failure, gameplay continues and errors appear in the browser console. Initial leaderboard entries are placeholders, not cached scores.

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
| `index.html` | Canvas, HUD, inventory, game-over form, leaderboard; loads `game.js` |
| `game.js` | Input, procedural generation, entities, combat, rendering, UI, and API requests |
| `styles.css` | Presentation, HUD, overlay, and fixed leaderboard sidebar |
| `images/` | Penguin and chest sprites plus favicon (`.ico`) |
| `drawing.js` | Unused drawing experiment with unfinished example code; not loaded |
| `AGENTS.md` | Maintenance guidance, session memory, validation, and pitfalls |

## Leaderboard integration

The backend is maintained separately. Both URLs are hardcoded near the bottom of `game.js`; there is no environment configuration.

| Method | Endpoint | Frontend contract |
| --- | --- | --- |
| GET | `https://jsgame-production.up.railway.app/api/leaderboard` | JSON array with `name`, `score`, and optional `gold` (defaults to 0) |
| POST | `https://jsgame-production.up.railway.app/api/submit-score` | JSON body: `{ "username": "Player", "score": 12, "gold": 50 }` |

Submission uses `username`, whereas display expects `name`. Remote entries appear in server order. The backend must allow the frontend origin through CORS. No credentials or backend code are included here.

## Development and validation

Edit the source and reload the browser. Keep DOM IDs synchronized between HTML and JavaScript. With Node.js installed, check syntax using:

```powershell
node --check game.js
```

There is no automated test suite, formatter configuration, or package manifest. For gameplay changes, manually check movement/walls, both weapons, pickups, chest rewards, floor transitions, game over, and retry. Inspect the console and test leaderboard failure handling. Mock API responses for submission tests to avoid adding test scores to production.

Known limitations include incomplete restart-state resets, a maze taller than the canvas, a fixed sidebar that can overlap gameplay, and limited HTTP error handling. See `AGENTS.md` for causes and proposed solutions. Deploy by serving the static files with their relative paths intact; no deployment configuration is tracked.
