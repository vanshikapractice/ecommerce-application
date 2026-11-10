# Deployment guide

ShopSmart is deployed as three independently built applications and one
MySQL-backed API.

## API

1. Provision Node.js 22 and MySQL 8.
2. Set `DATABASE_URL`, separate JWT secrets, `FRONTEND_URL`, `ADMIN_URL`, and
   `COOKIE_SECURE=true` in the API environment.
3. Run `pnpm install --frozen-lockfile`, `pnpm --filter @ecommerce/api db:generate`,
   and `pnpm --filter @ecommerce/api db:deploy`.
4. Start the compiled API with `node apps/api/dist/server.js`.
5. Monitor `GET /api/v1/health` and preserve the returned request IDs when
   investigating failures.

Production must use HTTPS. The refresh token is an HTTP-only cookie and uses
`SameSite=None` only when `COOKIE_SECURE=true`; configure CORS with the exact
customer and admin origins.

## Customer and admin frontends

Build each app with its Vite `VITE_API_BASE_URL` pointing to the public API
`/api/v1` URL:

```powershell
pnpm --filter @ecommerce/web build
pnpm --filter @ecommerce/admin build
```

Serve `apps/web/dist` and `apps/admin/dist` from separate HTTPS origins. The
API must allow both origins and credentials.

## Operations

Use additive Prisma migrations only. Never run `prisma migrate reset` or seed
commands against production. The current Socket.IO gateway is single-instance;
multiple API instances require a shared Socket.IO adapter and coordinated
health/draining behavior.

CI runs Playwright against an isolated MySQL service. Production environments
must never be used for E2E; use the documented `ecommerce_platform_e2e`
database and test-only credentials.
