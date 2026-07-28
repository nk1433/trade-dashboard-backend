---
name: trade-api
description: Adds or changes Express API routes, dbWrapper persistence, dual-DB schema, and scan logic in trade-dashboard-backend. Use for new endpoints, controllers, database changes, USE_MONGO, or scan criteria.
disable-model-invocation: true
---

# Trade API (backend)

## Checklist

```
- [ ] Grep existing route in src/app.js and src/controller/
- [ ] Handler in src/controller/ (match paperTrade.js)
- [ ] Mount in app.js; verifyToken if user-scoped
- [ ] dbWrapper for all persistence — no direct model imports
- [ ] If schema change: RDB + Mongo models + dbWrapper branch
- [ ] If scan change: src/utils/scans.js + node src/tests/scans.test.js
- [ ] pnpm lint
```

## Routes

1. Grep route path — avoid duplicates
2. Handler: validate input, call `dbWrapper`, return `{ status, data }` or `{ status: 'error', error }`
3. Mount in `src/app.js` with `verifyToken` for user data
4. JWT header: `Authorization: Bearer <token>`

## Dual-DB (when schema changes)

1. Sequelize model: `src/schema/RDB/<entity>.js`
2. Mongoose model: `src/schema/Mongo/<entity>.js`
3. Paired methods in `src/utils/dbWrapper.js` behind `USE_MONGO` branch
4. Export on default export; grep callers

## Scans (when scan logic changes)

- Logic: `src/utils/scans.js`
- API: `src/controller/scan.js`, `src/controller/scanCriteria.js`
- WS trigger: `src/ws/index.js`
- Test: `node src/tests/scans.test.js`

## Cross-repo

If frontend consumes endpoint, note contract for `C:\sai\trade-dashboard-nk`.

## Additional resources

- [reference.md](reference.md)
