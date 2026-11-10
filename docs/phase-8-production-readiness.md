# Phase 8: Testing, integration hardening, and production readiness

## Audit findings

- Backend tests existed, but frontend workspaces had no test runner.
- No CI workflow validated the monorepo.
- Authentication endpoints had no request throttling.
- Production could start with insecure refresh-cookie settings.
- README status text lagged behind the implemented order, payment, and
  notification workflows.
- Playwright and a dedicated test database were not configured, so E2E tests
  remain an explicit follow-up rather than an unverified claim.

## Implemented hardening

- Added a bounded in-memory rate limiter to registration, login, and refresh.
- Rejected `COOKIE_SECURE=false` when `NODE_ENV=production`.
- Disabled Express `x-powered-by`.
- Added Vitest + React Testing Library setup to customer and admin apps.
- Added credential validation tests and notification-list component tests.
- Added CI for frozen installation, Prisma validation, typecheck, lint, tests,
  and production builds.
- Added provider-neutral deployment instructions and updated project docs.

The rate limiter is intentionally process-local for this single-server
application. A horizontally scaled deployment should move this control to a
shared edge or store without introducing it as an untracked dependency.

## Verification scope

Backend unit/API tests run with mocked Prisma boundaries. Frontend tests mock
component/API boundaries. There is no dedicated Playwright project or isolated
test database yet; those are required before claiming the full customer/admin
checkout journey as an automated E2E pass.
