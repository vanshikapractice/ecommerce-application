# ShopSmart project setup

## Prerequisites

- Node.js 22 LTS
- pnpm 12+
- MySQL 8+

On Windows, install MySQL Server and confirm the service and CLI:

```powershell
Get-Service MySQL80
mysql --version
```

The current environment has MySQL80 running on `localhost:3306`.

## Database setup

Use a MySQL account that you control. Create the database from an authenticated
MySQL prompt:

```sql
CREATE DATABASE ecommerce_platform
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

Copy the environment template:

```powershell
Copy-Item apps/api/.env.example apps/api/.env
```

Replace `YOUR_MYSQL_PASSWORD` in `apps/api/.env`. If the password contains
characters such as `@`, `:`, `/`, or `#`, URL-encode them in `DATABASE_URL`.
For example, `p@ssword` becomes `p%40ssword`.

JWT secrets must be at least 32 characters and must be different:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Set `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` in `apps/api/.env`. Admin
seed values are optional; if used, set all three `SEED_ADMIN_*` variables.
The API resolves this file relative to `apps/api/src/config/env.ts`, so startup
does not depend on whether it is launched from the repository root or the API
workspace. Do not put these secrets in either Vite application's environment
files.

## Environment configuration

The backend environment file is `apps/api/.env`, based on
`apps/api/.env.example`. The JWT variables are mandatory:

```text
JWT_ACCESS_SECRET=<unique random value of at least 32 characters>
JWT_REFRESH_SECRET=<different unique random value of at least 32 characters>
```

Start the API independently with:

```powershell
pnpm --filter @ecommerce/api dev
```

Start customer, admin, and API together with:

```powershell
pnpm dev
```

Verify the API after startup:

```powershell
Invoke-RestMethod http://localhost:4000/api/v1/health
```

## Prisma

```powershell
pnpm install
pnpm --filter @ecommerce/api db:generate
pnpm --filter @ecommerce/api db:migrate -- --name foundation
pnpm --filter @ecommerce/api db:seed
pnpm --filter @ecommerce/api exec prisma migrate status
```

Use `db:deploy` for an existing deployment database:

```powershell
pnpm --filter @ecommerce/api db:deploy
```

Never use `prisma migrate reset` against shared or production data.

## Run the monorepo

```powershell
pnpm dev
```

- Customer app: `http://localhost:5173`
- Admin app: `http://localhost:5174`
- API: `http://localhost:4000`
- Health: `http://localhost:4000/api/v1/health`

## Verification

```powershell
pnpm typecheck
pnpm lint
pnpm test
pnpm format:check
pnpm build
```

## Troubleshooting

- `P1000`: verify the MySQL username/password and URL-encode special password characters.
- `P1001`: verify the MySQL80 service and port 3306.
- `P1012`: ensure `DATABASE_URL` is set before running Prisma commands.
- `DATABASE_UNAVAILABLE`: the API is running but cannot establish a Prisma database connection.

## Frontend tests

The customer and admin apps use Vitest with jsdom and React Testing Library:

```powershell
pnpm --filter @ecommerce/web test
pnpm --filter @ecommerce/admin test
```

The repository does not yet include Playwright or a dedicated isolated E2E
database. Playwright is now configured under `e2e/`; set `E2E_DATABASE_URL` to
the dedicated `ecommerce_platform_e2e` database before running `pnpm e2e`.
The configuration refuses development and production database names.
