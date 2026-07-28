---
description: Core project conventions for trade-dashboard-backend. Always follow AGENTS.md.
alwaysApply: true
---

# Project rules — trade-dashboard-backend

Follow **AGENTS.md** and **SKILLS.md** at the repository root.

## Essentials

- Express 5 API on port **3015**; package manager is **pnpm**
- All database access through `src/utils/dbWrapper.js`
- Protected routes must use `verifyToken` middleware
- Sibling frontend: `C:\sai\trade-dashboard-nk`
- Run `pnpm lint` before finishing changes

## Skills (load one per task)

- `trade-api` — routes, dbWrapper, dual-DB, scans
- `upstox-backend` — OAuth, WebSocket, cron

## Commands

- `/find-context <task>` — reads SKILLS.md, gathers context
- `/review-staged` — review staged git changes
