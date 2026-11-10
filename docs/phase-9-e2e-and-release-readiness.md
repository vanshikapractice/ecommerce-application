# Phase 9: E2E and release readiness

## Audit

The repository had backend/frontend tests and CI, but no browser automation or
isolated E2E database. The customer and admin applications are state-driven
single shells rather than route-based page trees, so broad lazy-route
refactoring would be risky. The initial production bundles were approximately
556 KB customer and 585 KB admin JavaScript, both over Vite's warning threshold.

## Playwright

Playwright is configured in [`e2e/playwright.config.ts`](../e2e/playwright.config.ts)
with one Chromium project, serial workers, failure traces/screenshots/videos,
HTML reporting, and a web server that starts the existing monorepo commands.
The config refuses to run unless `E2E_DATABASE_URL` names
`ecommerce_platform_e2e`; it never falls back to the development database.

Configure:

```powershell
$env:E2E_DATABASE_URL='mysql://user:password@localhost:3306/ecommerce_platform_e2e'
$env:E2E_CUSTOMER_EMAIL='customer@example.test'
$env:E2E_CUSTOMER_PASSWORD='a-test-password'
pnpm --filter @ecommerce/api exec prisma migrate deploy
pnpm --filter @ecommerce/api db:seed
pnpm e2e
```

The current executable scenarios cover isolated API health, customer login and
session restoration when credentials are configured, and the initial customer
product/cart flow. Authentication-dependent tests skip with an explicit
configuration message when credentials are absent; they are not reported as
passed. Full customer-to-admin payment/notification workflows remain blocked
until deterministic customer/admin fixture seeding is added.

## Performance

The web and admin Vite builds now split MUI/Emotion and Axios/Socket.IO into
named vendor chunks. Before this change, the largest JavaScript chunks were
approximately 556 KB (customer) and 585 KB (admin). The verified optimized
build produced application chunks of 224.82 KB and 229.10 KB, with separate
MUI chunks of 228.15 KB and 252.96 KB and networking chunks of 100.93 KB.
The Vite 500 KB warning no longer appears. Total downloaded JavaScript is not
reduced by manual chunking; route-level lazy loading is a future improvement
once the state-driven shells are decomposed into stable page components.

## CI and release risks

CI now has an isolated MySQL service and a separate Playwright job. It applies
existing migrations, seeds only the E2E database, installs Chromium, runs E2E,
and uploads the report. No production deployment is configured.

Remaining risks:

- Full checkout/payment/retry and customer-admin status propagation are not yet
  executed by browser tests.
- E2E customer/admin fixture credentials must be provisioned through CI
  environment variables or a dedicated safe seed script.
- The in-memory auth rate limiter and single-server Socket.IO gateway do not
  support horizontal scaling without shared infrastructure.
