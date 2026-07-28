# Upstox backend — reference

## OAuth flow

1. Frontend redirects user to Upstox with `UPSTOX_API_KEY`
2. Callback hits frontend `/redirect` or `/upstox/callback`
3. Backend `POST /auth/callback` in `auth.js` exchanges code for token

## WebSocket init

`src/app.js`: `connectWsUpstoxs(process.env.UPSTOXS_ANALYTICS_TOKEN)`

`src/server.js`: when `LOWER_ENV === 'false'`, calls `intiateAccessTokenReq()` on startup

## Cron (IST)

`src/cron/index.js` — stats sync 8:00, market breadth 8:30, token init 9:00/9:10/9:15

## Sibling frontend env

`VITE_UPSTOXS_ACCESS_KEY`, `VITE_UPSTOXS_ANALYTICS_TOKEN`, `VITE_IS_SANDBOX`
