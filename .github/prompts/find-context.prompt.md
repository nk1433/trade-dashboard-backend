---
description: Gather relevant context for a task before making code changes. Do not edit files.
---

Gather relevant context for a task before making code changes. **Do not edit any files.**

Parse the user's task from the text after `/find-context`. If no task is provided, ask what they want to work on.

## Steps

0. **Read SKILLS.md** — pick one skill: `trade-api` or `upstox-backend`

1. **Identify scope** — Determine which feature, route, slice, or bug the task relates to.

2. **Search this repo** — Use grep and glob to find:
   - Controllers and routes in `src/controller/`
   - Services in `src/services/`
   - Database access in `src/utils/dbWrapper.js` and `src/schema/`
   - WebSocket logic in `src/ws/`
   - Cron jobs in `src/cron/`
   - Related tests in `src/tests/`

3. **Check sibling repo** — If the task touches API contracts, auth, or frontend integration, also search:
   - `C:\sai\trade-dashboard-nk` for Redux slices, components, and hooks that call this backend

4. **Trace data flow** — Map the path, e.g.:
   - Frontend component → Redux thunk → `VITE_BACKEND_URL` endpoint → controller → `dbWrapper` → DB
   - WebSocket: Upstox feed → `src/ws/index.js` → scan logic → DB

5. **Read AGENTS.md** — Note conventions, env vars, and do/don't rules from the repo root `AGENTS.md`.

## Output format

### Task
(One-line restatement of the goal)

### Relevant files
(Bullet list with paths and one-line purpose each)

### Data flow
(Short description or bullet chain)

### Conventions to follow
(From AGENTS.md and existing code patterns)

### Environment variables involved
(Any `process.env.*` keys that affect this area)

### Suggested next steps
(Ordered list of what to change or investigate)

**Do not make code changes.** Context gathering only.
