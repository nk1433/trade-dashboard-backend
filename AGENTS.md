# AGENTS.md — trade-dashboard-backend

Instructions for AI agents working in this repository.

## Project overview

Express 5 API for a trading dashboard: market data sync, scans, paper trading, Upstox integration, WebSockets, and scheduled jobs. Supports **PostgreSQL** (default, via Sequelize) or **MongoDB** (via Mongoose) through a dual-DB abstraction in `src/utils/dbWrapper.js` toggled by `USE_MONGO=true`.

**Sibling repo:** Frontend SPA at `C:\sai\trade-dashboard-nk` — talks to this API on port **3015**.

## Essential commands

```bash
pnpm install          # Install dependencies
pnpm start            # Dev server (nodemon) on port 3015
pnpm lint             # ESLint
node src/tests/scans.test.js   # Manual scan logic tests
```

There is no configured `pnpm test` script. Swagger UI: `http://localhost:3015/api-docs`.

## Architecture

```
src/server.js          # HTTP entry — listen, DB sync, cron, WS init
src/app.js             # Express app — routes, middleware, Swagger
src/controller/        # Route handlers (Express routers)
src/utils/dbWrapper.js # Dual-DB abstraction — always use this for persistence
src/database/          # Sequelize (PostgreSQL) and Mongoose (MongoDB) connections
src/schema/RDB/        # Sequelize models
src/schema/Mongo/      # Mongoose models
src/services/          # Business logic (stats, market breadth)
src/ws/                # Upstox market data WebSocket + native WS server
src/cron/              # Scheduled jobs (IST timezone)
src/middleware/        # JWT auth (verifyToken)
index.js               # Serverless Lambda handler (serverless-express)
```

### Key routes (`src/app.js`)

| Path | Purpose |
|------|---------|
| `/api/health` | Health check |
| `/sync-*`, `/stats/all` | Market stats sync |
| `/place-order` | Order placement |
| `/upstoxs/*` | Upstox OAuth and token management |
| `/api/scans` | Scan results (JWT required) |
| `/scans/criteria` | Scan criteria CRUD |
| `/api/users` | User auth (signup/login) |
| `/settings` | User settings |
| `/api/paper-trade/*` | Paper trading (JWT required) |
| `/api/tv/1.1/charts` | TradingView chart storage |
| `/webhook` | Alert webhooks |
| `/auth/callback` | Upstox OAuth token exchange |

## Environment variables

Loaded via `dotenv` from `.env` (gitignored). Copy defaults from the existing `.env` in the repo root.

| Variable | Required | Purpose |
|----------|----------|---------|
| `USE_MONGO` | No | `'true'` → MongoDB; otherwise PostgreSQL |
| `MONGODB_URI` | If Mongo | MongoDB connection string |
| `JWT_SECRET` | Yes (prod) | JWT sign/verify; defaults to `'secret_key'` in code |
| `UPSTOX_API_KEY` | For OAuth | Upstox OAuth client_id |
| `UPSTOX_API_SECRET` | For OAuth | Upstox OAuth client_secret |
| `UPSTOX_REDIRECT_URI` | For OAuth | OAuth redirect (e.g. `http://localhost:5173/redirect`) |
| `UPSTOXS_ANALYTICS_TOKEN` | For WS | Upstox API bearer token for WebSocket + instrument search |
| `UPSTOXS_CLIENT_ID` | For WS | Upstox Indie token initiation |
| `UPSTOXS_CLIENT_SECRET` | For WS | Upstox Indie token initiation |
| `LOWER_ENV` | No | `'true'` = dev (static token, no reconnect); `'false'` = prod |
| `VITE_FRONTEND_REDIRECT_URL` | Prod | Post-OAuth redirect when `LOWER_ENV !== 'true'` |

**Hardcoded (not env-driven):**

- HTTP port: **3015** (`src/server.js`)
- PostgreSQL URL: `postgres://postgres:admin@localhost:5432/postgres` (`src/database/index.js`)

## Coding conventions

- **ES modules** (`"type": "module"`)
- **ESLint** flat config: 2-space indent, double quotes, semicolons, `import/order` with alphabetize
- **Dual-DB rule:** All persistence goes through `dbWrapper.js` — never import Sequelize/Mongoose models directly from controllers
- **Auth:** Protected routes use `verifyToken` middleware; JWT in `Authorization: Bearer <token>`
- **Response shapes:** Mix of `{ success, error }`, `{ status, data, meta }`, and `{ message }` — match surrounding code

## Do / Don't

**Do:**

- Keep changes minimal and focused
- Use `dbWrapper` for all database access
- Add `verifyToken` to new protected routes
- Run `pnpm lint` before finishing

**Don't:**

- Bypass `verifyToken` on sensitive endpoints
- Hardcode secrets — use `.env`
- Import DB models directly in controllers when `dbWrapper` has a method
- Commit `.env` files

## Verification

1. `pnpm lint` — no errors
2. `pnpm start` — server starts on 3015
3. `curl http://localhost:3015/api/health` — returns OK

## Token optimization

| Rule | Action |
|------|--------|
| Search before read | Grep/Glob `src/controller`, `dbWrapper`, route names |
| Never bulk-read | `src/index/*.json`, lock files, `node_modules/`, full `dbWrapper.js` |
| Narrow reads | `offset`/`limit` on large files; ~80 lines max unless editing |
| Start tasks | Read [SKILLS.md](SKILLS.md) or run `/find-context` first |
| Cross-repo | Open frontend only when API/auth/WS contracts change |
| Budget | One skill + one `reference.md` per task |

Always-on rules: `.cursor/rules/token-optimization.mdc`, `.trae/rules/token-optimization.md`

## Skills

Project skills — see [SKILLS.md](SKILLS.md). Load **one** skill per task:

| Skill | When |
|-------|------|
| `trade-api` | Routes, dbWrapper, dual-DB, scans |
| `upstox-backend` | OAuth, WebSocket, cron, market data |

Cursor review skills:

| Skill | When to use |
|-------|-------------|
| `/review-bugbot` | Full bug review via Bugbot subagent |
| `/review-security` | Security-focused review |

## Commands

| Command | Purpose |
|---------|---------|
| `/find-context <task>` | Gather context; reads SKILLS.md first |
| `/review-staged` | Review git staged changes before commit |

## IDE support

This repo is configured for multiple AI IDEs. **`AGENTS.md` is the canonical source** — other files point here or mirror these instructions.

| IDE | Instructions file | Slash commands |
|-----|-------------------|----------------|
| **Cursor** | `AGENTS.md` | `.cursor/commands/find-context.md`, `.cursor/commands/review-staged.md` |
| **Trae** | `AGENTS.md`, `.trae/rules/project.md` | `.trae/commands/find-context.md`, `.trae/commands/review-staged.md` |
| **VS Code** (GitHub Copilot) | `.github/copilot-instructions.md` | `.github/prompts/find-context.prompt.md`, `.github/prompts/review-staged.prompt.md` |
| **Claude Code** | `CLAUDE.md` | — |

**VS Code setup:** `.vscode/settings.json` enables `chat.promptFiles`. Type `/find-context` or `/review-staged` in Copilot Chat.

**Trae setup:** Enable **Include AGENTS.md** in Settings → Rules.
