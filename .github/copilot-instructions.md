# GitHub Copilot instructions — trade-dashboard-backend

> **Canonical source:** [AGENTS.md](../AGENTS.md) — apply every section of that file when working in this repository.

## Project

Express 5 API for a trading dashboard (port **3015**). PostgreSQL default, MongoDB optional (`USE_MONGO=true`). Dual-DB via `src/utils/dbWrapper.js`.

**Sibling repo:** Frontend at `C:\sai\trade-dashboard-nk` (port 5173).

## Commands

```bash
pnpm install && pnpm start    # Dev server on 3015
pnpm lint                     # ESLint
node src/tests/scans.test.js  # Manual tests
```

## Rules

- All DB access through `dbWrapper.js` — never import models directly in controllers
- Protected routes must use `verifyToken` middleware
- ES modules, 2-space indent, double quotes, semicolons
- Secrets in `.env` only — never commit `.env`
- Keep changes minimal; match existing response shapes

## Slash prompts

Use `/find-context` or `/review-staged` from `.github/prompts/`.

## Skills

Read [SKILLS.md](../SKILLS.md) — load one skill: `trade-api` or `upstox-backend`.

## Token rules

Grep before read. Never bulk-read `src/index/*.json` or lock files. Token rules in `.cursor/rules/token-optimization.mdc`.

## Verification

`pnpm lint` → `pnpm start` → `curl http://localhost:3015/api/health`
