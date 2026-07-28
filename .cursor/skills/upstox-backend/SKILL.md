---
name: upstox-backend
description: Implements Upstox OAuth, WebSocket market data, token cron, and analytics in trade-dashboard-backend. Use for Upstox integration, OAuth, WebSocket, market data feeds, or UPSTOX env vars.
disable-model-invocation: true
---

# Upstox backend integration

## Key files (grep before read)

| Area | Path |
|------|------|
| OAuth token exchange | `src/controller/auth.js` |
| Upstox routes | `src/controller/upstoxs.js` |
| Market data WS | `src/ws/index.js` |
| Token initiation | `src/ws/utils.js` |
| Cron jobs | `src/cron/index.js` |

## Env vars

- `UPSTOX_API_KEY`, `UPSTOX_API_SECRET`, `UPSTOX_REDIRECT_URI` — user OAuth
- `UPSTOXS_ANALYTICS_TOKEN`, `UPSTOXS_CLIENT_ID`, `UPSTOXS_CLIENT_SECRET` — WS/analytics
- `LOWER_ENV=true` — dev mode (static token, no cron reconnect)
- `VITE_FRONTEND_REDIRECT_URL` — prod OAuth redirect

## Workflow

1. Grep symbol in files above — do not read full `ws/index.js` unless editing
2. OAuth: `auth.js` exchanges code for `access_token`
3. WS: `connectWsUpstoxs(token)` called from `app.js` with `UPSTOXS_ANALYTICS_TOKEN`
4. Prod token refresh: cron in `src/cron/index.js` when `LOWER_ENV !== 'true'`

## Cross-repo

Frontend OAuth callback: `C:\sai\trade-dashboard-nk\src\Components\UpstoxCallback.jsx`
Frontend WS: `src/hooks/useUpstoxWS.js`

## Additional resources

- [reference.md](reference.md)
