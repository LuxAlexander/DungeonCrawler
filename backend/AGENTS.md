# Backend guidance

Root `AGENTS.md` also applies. This is the CommonJS Express/MongoDB leaderboard service, currently undeployed. Do not provision local infrastructure as part of routine frontend work.

## Structure and commands

- `server.js`: dotenv loading, CORS, JSON parsing, router mounting, HTTP listener, database startup.
- `db/conn.js`: MongoClient singleton; uses `ATLAS_URI` and `DB_NAME`. Collection name `Scores` is chosen in the router.
- `endpoints/leaderboard.js`: GET top 10 scores descending and POST score insertion. POST accepts `username`; stored/returned documents use `name`.
- Install with `npm ci` from this directory; start with `npm start`. `npm run dev` uses Node's built-in watch mode, replacing the old undeclared nodemon dependency.
- `npm run check` checks syntax without connecting to a database. There is no automated API test suite; the old failing placeholder test script was removed.
- Node.js minimum 20.19 is required by the locked MongoDB 7 dependencies. Use a supported LTS release for hosting.
- Railway service root: `/backend`; config file path: `/backend/railway.json`. Required hosting variables: `PORT`, `ATLAS_URI`, `DB_NAME`. `.env.example` contains placeholders, not real credentials.

## Existing pitfalls and proposed solutions

These are deferred issues, not changes made by the repository migration.

| Pitfall | Proposed solution |
| --- | --- |
| The HTTP listener starts before MongoDB connects. `getDb()` can initially return undefined. | Await a successful database connection before accepting requests; add readiness checks if deployment needs them. |
| `connectToServer()` is async and does not consume the callback passed by `server.js`. | Use one async startup path and explicit error handling. |
| POST checks only that score is defined; numeric conversion permits invalid values and names have no server length limit. | Validate name, score, and gold types, lengths, finite values, and acceptable ranges before insertion. Client constraints are not validation. |
| Scores are supplied entirely by the client. | Treat leaderboard results as unverified; decide appropriate anti-abuse measures before presenting it as competitive ranking. |
| CORS allows every origin and is configured twice. | Consolidate middleware and configure intended frontend origins when deployment requirements are settled. |
| Error responses return raw exception messages. | Log details server-side and send stable, non-sensitive client errors. |
| The original npm test script intentionally failed; no actual tests exist. | Add focused route/database-boundary tests when changing API behavior. Do not report syntax checks as integration tests. |

Use mocked storage for API verification unless a real database test is explicitly authorized. Never submit dummy scores to a public deployment. Keep environment files and installed dependencies ignored; do not copy the original checkout's `.env` into this repository.
