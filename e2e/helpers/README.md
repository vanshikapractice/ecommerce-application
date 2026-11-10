# E2E environment

E2E commands require `E2E_DATABASE_URL` with the database name
`ecommerce_platform_e2e`. The Playwright config refuses other database names.
Set `E2E_CUSTOMER_EMAIL` and `E2E_CUSTOMER_PASSWORD` for authenticated tests.

Prepare the isolated database without touching development data:

```powershell
$env:E2E_DATABASE_URL='mysql://user:password@localhost:3306/ecommerce_platform_e2e'
pnpm --filter @ecommerce/api exec prisma migrate deploy
pnpm --filter @ecommerce/api db:seed
pnpm e2e
```

The seed command uses the database URL inherited by the process. Do not copy
development `.env` files into the E2E environment or use `prisma migrate reset`.
