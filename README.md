# E-commerce Platform

Production-style e-commerce monorepo built incrementally with pnpm, TypeScript,
React, Express, Prisma, and MySQL.

## Current status

The repository has independently deployable customer, admin, and API workspaces,
shared TypeScript contracts, Prisma/MySQL connectivity, secure access and refresh
token authentication, role checks, catalogue, cart, wishlist, orders, mock
payments, persistent notifications, and admin workflows. Phase 8 adds frontend
tests, API hardening, CI validation, and deployment guidance.

## Prerequisites

- Node.js 22 LTS (or a compatible current LTS)
- pnpm 12+

## Local development

```powershell
pnpm install
pnpm dev
```

The customer app runs at `http://localhost:5173`, the admin app at
`http://localhost:5174`, and the API at `http://localhost:4000`.

Useful checks:

```powershell
pnpm typecheck
pnpm lint
pnpm build
pnpm format:check
pnpm test
pnpm e2e
```

## Database foundation

Configure MySQL and copy `apps/api/.env.example` to `apps/api/.env`, then run:

```powershell
pnpm --filter @ecommerce/api db:generate
pnpm --filter @ecommerce/api db:migrate -- --name foundation
pnpm --filter @ecommerce/api db:seed
```

See [`docs/database-foundation.md`](docs/database-foundation.md) for the
production migration workflow and catalogue migration notes.

See [`docs/deployment.md`](docs/deployment.md) for production environment,
migration, frontend hosting, and health-check guidance.

Browser tests require an isolated MySQL database named
`ecommerce_platform_e2e`; see [`docs/phase-9-e2e-and-release-readiness.md`](docs/phase-9-e2e-and-release-readiness.md).

## Workspace layout

- `apps/web`: customer-facing React application.
- `apps/admin`: administrative React application.
- `apps/api`: versioned Express API boundary.
- `packages/shared`: framework-neutral contracts, constants, and schemas shared
  by applications.
- `packages/config`: reserved for reusable organization-wide tool configuration
  in a later setup step.
