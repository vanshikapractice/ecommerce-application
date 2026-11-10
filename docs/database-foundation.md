# Database foundation

Prisma migrations establish MySQL persistence for system settings,
authentication, categories, and products. Product listing queries use
server-side filtering and pagination; prices are read from Prisma and converted
for API responses rather than accepted from the browser.

## Local setup

1. Install and start MySQL.
2. Create the database:

   ```sql
   CREATE DATABASE ecommerce_platform
     CHARACTER SET utf8mb4
     COLLATE utf8mb4_unicode_ci;
   ```

3. Copy `apps/api/.env.example` to `apps/api/.env` and set `DATABASE_URL`.
4. From the repository root, run:

   ```powershell
   pnpm install
   pnpm --filter @ecommerce/api db:generate
   pnpm --filter @ecommerce/api db:migrate
   pnpm --filter @ecommerce/api db:seed
   ```

For deployment or an existing database, use `db:deploy` instead of
`db:migrate`. Never use `migrate reset` against a shared or production
database.

The catalogue migration is additive and is named
`20261031100000_catalogue`. Run the repeatable seed after applying migrations
to create demonstration categories and products.

## Request flow

The API creates one Prisma client for the process. Requests receive an
`x-request-id`, are logged with method, path, status, and duration, and then
reach the route. Database failures and validation failures are translated by
the centralized error handler into safe JSON responses.
