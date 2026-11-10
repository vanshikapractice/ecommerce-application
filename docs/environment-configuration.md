# Environment configuration

## Backend file

The API reads `apps/api/.env`. Copy the committed template before first
startup:

```powershell
Copy-Item apps/api/.env.example apps/api/.env
```

`apps/api/src/config/env.ts` resolves the file relative to the backend source
file with `dotenv`, before Zod validates `process.env`. This works for both
`pnpm --filter @ecommerce/api dev` and root `pnpm dev`; it does not depend on
the current working directory.

## Required JWT configuration

Add two separate secure random values:

```text
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
PAYMENT_PROVIDER=mock
PAYMENT_CURRENCY=INR
```

Generate a value without logging or committing it:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Run the command twice and place the two results in `apps/api/.env`. Each must
be at least 32 characters, and they must not be equal. JWT secrets must not be
hardcoded in source, frontend environment files, seed scripts, or Git history.

## Other backend values

Keep `DATABASE_URL`, `PORT`, `FRONTEND_URL`, `ADMIN_URL`, and the Prisma
configuration in `apps/api/.env`. The API validates the MySQL URL, URLs,
logging level, token expiry, cookie mode, and optional administrator seed
values at startup.

For production, set `NODE_ENV=production`, use HTTPS, and set
`COOKIE_SECURE=true`. Startup rejects insecure refresh-cookie configuration in
production. Configure `FRONTEND_URL` and `ADMIN_URL` as exact trusted origins.

## Starting and checking the applications

```powershell
pnpm --filter @ecommerce/api dev
pnpm dev
Invoke-RestMethod http://localhost:4000/api/v1/health
```

The full workspace starts the customer app on port 5173, admin app on 5174,
and API on port 4000. A missing variable produces a readable validation error
containing variable names and requirements, never secret values.
