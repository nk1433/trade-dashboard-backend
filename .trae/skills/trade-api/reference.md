# Trade API — reference

## Canonical examples

| Pattern | Path |
|---------|------|
| Controller | `src/controller/paperTrade.js` |
| Route mount | `src/app.js` — `/api/paper-trade/*` with `verifyToken` |
| dbWrapper | `getPaperPortfolio`, `upsertPaperPortfolio` |
| Dual-DB models | `src/schema/RDB/paperPortfolio.js`, `src/schema/Mongo/paperPortfolio.js` |

## Response shapes

```javascript
res.json({ status: 'success', data: result });
res.status(400).json({ status: 'error', error: 'message' });
```

## Scans

- `src/utils/scans.js` — algorithms
- `src/tests/scans.test.js` — `node src/tests/scans.test.js`

## Env

`USE_MONGO=true` toggles Mongo vs PostgreSQL via `dbWrapper.js`
