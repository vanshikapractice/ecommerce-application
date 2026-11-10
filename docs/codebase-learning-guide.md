# ShopSmart codebase learning guide

This guide is the central map for the repository. It describes the actual
implementation, including the places where the project intentionally uses a
single state-driven React shell instead of a page-per-route architecture.

## Architecture at a glance

```text
Browser (customer/admin React shell)
  -> Axios API client (in-memory access token + HTTP-only refresh cookie)
  -> Express /api/v1 route
  -> authentication/authorization + Zod validation
  -> controller
  -> service or repository
  -> Prisma transaction/query
  -> MySQL

Order/payment success
  -> notification service persists with dedupe key
  -> Socket.IO user:<JWT subject> room
  -> browser notification state
```

The backend separates HTTP concerns from persistence: routes compose
middleware, controllers translate requests/results into responses, services
coordinate business workflows, and repositories own Prisma queries. Some
legacy commerce modules put orchestration directly in repositories; the order
and payment paths should be read with that convention in mind.

## File inventory

### Backend application

| File path | Responsibility | Important connections |
|---|---|---|
| [app.ts](../apps/api/src/app.ts) | Creates Express middleware, CORS, security headers, routes, health, and error boundaries. | Imports every router and shared error/request middleware. |
| [server.ts](../apps/api/src/server.ts) | Starts the HTTP server, attaches Socket.IO, and performs graceful Prisma shutdown. | Connects `app`, `notification.gateway`, and Prisma. |
| [config/env.ts](../apps/api/src/config/env.ts) | Loads API `.env` relative to the source file and validates configuration with Zod. | Consumed by auth, cookies, payment factory, CORS, and server startup. |
| [database/prisma.ts](../apps/api/src/database/prisma.ts) | Provides the shared Prisma client. | Imported by repositories and health checks. |
| [common/middleware/*](../apps/api/src/common/middleware) | Request IDs, logging, authentication, role checks, validation, 404 handling, and rate limiting. | Runs before controllers; errors flow to `error-handler.ts`. |
| [common/utils/token.ts](../apps/api/src/common/utils/token.ts) | Creates/verifies short-lived JWT access tokens and hashes refresh tokens. | Used by auth service, HTTP authentication, and Socket.IO authentication. |
| [common/utils/auth-cookie.ts](../apps/api/src/common/utils/auth-cookie.ts) | Sets/clears the HTTP-only refresh cookie. | Used only by auth controllers. |
| [common/utils/password.ts](../apps/api/src/common/utils/password.ts) | Wraps bcrypt hashing and comparison. | Used by auth service and seed. |
| [modules/auth](../apps/api/src/modules/auth) | Registration, login, refresh rotation, logout, session listing/revocation. | Controller -> service -> repository; role middleware protects role views. |
| [modules/catalogue](../apps/api/src/modules/catalogue) | Public product/category listing and validation. | Customer API client consumes product projections. |
| [modules/cart](../apps/api/src/modules/cart) | Authenticated cart reads and quantity mutations. | Cart owns no prices; order creation rereads products. |
| [modules/wishlist](../apps/api/src/modules/wishlist) | Authenticated wishlist reads and product membership changes. | Composite uniqueness prevents duplicate items. |
| [modules/orders](../apps/api/src/modules/orders) | Customer order creation/list/detail/cancel and admin status management. | Uses Decimal totals, conditional stock updates, transactions, and notifications. |
| [modules/payments](../apps/api/src/modules/payments) | Provider-independent mock payment orchestration and order payment state. | Service validates ownership/eligibility; repository updates payment and order transactionally. |
| [modules/notifications](../apps/api/src/modules/notifications) | Persistent notification CRUD, dedupe, admin fan-out, and Socket.IO delivery. | Persistence happens before `notification:new` emission. |
| [modules/admin](../apps/api/src/modules/admin) | Admin dashboard, catalogue, category, customer, and inventory operations. | Routes require `authenticate` and `authorize('ADMIN')`. |
| [tests](../apps/api/tests) | Jest/Supertest foundation and schema/provider tests. | Prisma is mocked for HTTP boundary tests; no destructive test database reset is used. |

### Customer frontend

| File path | Responsibility | Important connections |
|---|---|---|
| [main.tsx](../apps/web/src/main.tsx) | Mounts the React shell and global SCSS under StrictMode. | Imports `App.tsx`. |
| [App.tsx](../apps/web/src/App.tsx) | State-driven customer shell: auth, catalogue, cart, wishlist, checkout, orders, payments, and notifications. | Calls `api.ts`; state changes select the visible view. |
| [api.ts](../apps/web/src/api.ts) | Axios instance, access-token interceptor, refresh single-flight, and typed resource APIs. | Keeps refresh credentials in the HTTP-only cookie rather than local storage. |
| [validation.ts](../apps/web/src/validation.ts) | Pure credential validation used by the login/register form and tests. | Demonstrates testable UI rules outside the large shell. |
| [styles/global.scss](../apps/web/src/styles/global.scss) | Global box sizing, overflow, and image constraints. | Loaded by `main.tsx`. |
| [vite.config.ts](../apps/web/vite.config.ts) | Vite build and vendor chunk configuration. | Splits MUI/Emotion and networking dependencies. |
| [vitest.config.ts](../apps/web/vitest.config.ts) | jsdom and Testing Library test setup. | Runs `validation.test.ts`. |

The customer shell uses local React state rather than active React Router,
Redux Saga, or React Query flows. Those packages remain declared dependencies,
but the current production path is the explicit Axios client and `App.tsx`
state machine.

### Admin frontend

| File path | Responsibility | Important connections |
|---|---|---|
| [main.tsx](../apps/admin/src/main.tsx) | Mounts the admin shell and global SCSS. | Imports `App.tsx`. |
| [App.tsx](../apps/admin/src/App.tsx) | Authenticated dashboard shell and dashboard/product/category/customer/inventory/order/notification sections. | Uses `api.ts`, MUI, and Socket.IO. |
| [api.ts](../apps/admin/src/api.ts) | Admin Axios client, in-memory token, refresh flow, typed admin APIs. | Backend independently rechecks ADMIN authorization. |
| [components/NotificationList.tsx](../apps/admin/src/components/NotificationList.tsx) | Reusable notification rendering/read action. | Used by the Notifications section and covered by Vitest. |
| [styles/global.scss](../apps/admin/src/styles/global.scss) | Responsive admin layout baseline. | Loaded by `main.tsx`. |
| [vite.config.ts](../apps/admin/vite.config.ts) | Vite build and vendor chunks. | Keeps large UI/network libraries out of the application chunk. |
| [vitest.config.ts](../apps/admin/vitest.config.ts) | jsdom and Testing Library setup. | Runs notification component tests. |

Frontend role checks improve UX but are not the security boundary. Every admin
API route repeats JWT authentication and ADMIN authorization on the server.

### Shared packages and root configuration

| File/path | Responsibility |
|---|---|
| [packages/shared/src/index.ts](../packages/shared/src/index.ts) | Framework-neutral contracts/schemas shared by workspaces. |
| [packages/config/src/index.ts](../packages/config/src/index.ts) | Reusable workspace configuration entry point. |
| [package.json](../package.json) | Workspace scripts including typecheck, lint, test, build, and E2E commands. |
| [pnpm-workspace.yaml](../pnpm-workspace.yaml) | Declares `apps/*` and `packages/*` workspaces. |
| [turbo.json](../turbo.json) | Build dependency graph, caching, outputs, and environment forwarding. |
| [eslint.config.mjs](../eslint.config.mjs) | TypeScript, React Hooks, and React refresh lint rules. |
| [tsconfig.json](../tsconfig.json) | Root TypeScript project references/options. |
| [.github/workflows/ci.yml](../.github/workflows/ci.yml) | Validation job plus isolated MySQL/Playwright E2E job. |

### Database

| File/path | Responsibility |
|---|---|
| [schema.prisma](../apps/api/prisma/schema.prisma) | Source of truth for MySQL models, relations, indexes, constraints, and enums. |
| [seed.ts](../apps/api/prisma/seed.ts) | Idempotently seeds categories/products and optional admin credentials. |
| [migrations/](../apps/api/prisma/migrations) | Additive schema history; deployment uses `prisma migrate deploy`. |

Core relationships are:

- `User -> Cart -> CartItem -> Product`
- `User -> Wishlist -> WishlistItem -> Product`
- `User -> Order -> OrderItem -> Product`
- `Order -> Payment`
- `User -> Notification`
- `User -> RefreshToken`

Orders preserve product name/image/price snapshots in `OrderItem`, while
`Product` remains a restricted foreign key so historical items cannot point to
a deleted product. Monetary values use Prisma Decimal with two decimal places;
serialization converts them to numbers only at the API boundary.

### Tests and E2E

| File/path | Responsibility |
|---|---|
| [apps/api/tests](../apps/api/tests) | Backend boundary, validation, and provider tests. |
| [apps/web/src/validation.test.ts](../apps/web/src/validation.test.ts) | Customer credential validation tests. |
| [apps/admin/src/components/NotificationList.test.tsx](../apps/admin/src/components/NotificationList.test.tsx) | Admin notification rendering/read-action tests. |
| [e2e/playwright.config.ts](../e2e/playwright.config.ts) | Serial Chromium E2E config, failure artifacts, web server, and E2E database guard. |
| [e2e/tests](../e2e/tests) | Health, customer auth, and initial cart workflow scenarios. |

E2E configuration refuses to load unless `E2E_DATABASE_URL` names
`ecommerce_platform_e2e`; it must never be pointed at development or
production data.

## Important workflows

### Authentication

1. `auth.routes.ts` validates the request and applies rate limiting to
   register/login/refresh.
2. `auth.service.ts` hashes passwords, checks account state, issues a short JWT
   access token, and creates a hashed refresh-token database record.
3. `auth.controller.ts` returns the access token and sets the raw refresh token
   only as an HTTP-only cookie.
4. Frontends keep the access token in memory. Axios retries a 401 through the
   refresh endpoint using the cookie, then repeats the original request.
5. Refresh rotates the database token and revokes the old record; reuse revokes
   all sessions.
6. Backend `authenticate` verifies the JWT on every protected request and
   `authorize` checks the role.

### Product, cart, and wishlist

`catalogueRepository` reads active products with pagination/search/category
filters. The customer shell renders the result and sends add/update/remove
requests through `cartApi` or `wishlistApi`. Cart quantities are persisted by
user and product composite uniqueness prevents duplicates. Prices are not
trusted from the browser; order creation rereads current product rows.

### Order creation and cancellation

`orderRepository.create` runs a Prisma transaction:

1. Read the authenticated customer's cart with current products.
2. Reject an empty cart, inactive product, or insufficient stock.
3. Conditionally decrement stock with `stock >= quantity`, preventing a stale
   request from taking stock below zero.
4. Calculate Decimal subtotal, shipping, and total.
5. Create the order and item snapshots.
6. Read the complete order projection and clear cart items before commit.
7. The controller publishes customer/admin notifications after success.

Cancellation is ownership-scoped and allowed only for pending/confirmed unpaid
orders. The same transaction restores item quantities and changes status.
Admin status transitions use an explicit allowed-transition map and restore
stock when an eligible admin cancellation occurs.

### Payments

`payment.provider.ts` defines the gateway contract; `payment.factory.ts` selects
the configured provider; `mock-payment.provider.ts` deterministically returns
success/failure/cancel outcomes. `payment.service.create` verifies order
ownership, payable status, stored amount, and duplicate in-progress requests.
`payment.repository.updateResult` changes payment and order payment status in a
transaction. Failed/cancelled records can be retried, while successful orders
cannot be paid again. Notifications are emitted only after the result is
persisted.

### Notifications and Socket.IO

Order/payment controllers call `notificationService.publish` after the business
operation succeeds. The service uses a unique dedupe key, persists first, then
projects safe fields and emits `notification:new` to `user:<JWT subject>`.
Socket authentication verifies the same access token as HTTP authentication;
clients cannot choose rooms. The database remains the source of truth for
offline/reconnect retrieval. Notification failures are logged explicitly and
do not roll back an already completed order/payment operation.

### Admin operations

Admin login still uses the shared auth flow. The admin shell displays
management sections and calls `/api/v1/admin/*`. The server route applies
`authenticate` and `authorize('ADMIN')`, then validates input before the
controller/repository operation. Product forms load categories from the API,
inventory updates persist stock, order views search/filter paginated records,
and valid status changes notify the affected customer.

## Interview explanation

- **Why refresh cookies?** A refresh credential is long-lived and therefore
  stays HTTP-only; the short access token is held in memory and rotated through
  the refresh endpoint.
- **Why transactions?** Order creation, stock mutation, cart clearing, and
  payment/order status updates must commit together or not at all.
- **Why snapshots?** Product names/images/prices can change after purchase;
  historical orders must remain readable.
- **Why repository boundaries?** Controllers should translate HTTP, while
  persistence and transaction details stay reusable and testable.
- **Why dedupe keys?** Retries should not create duplicate user-visible
  notifications.
- **Why Decimal?** Binary floating point is unsafe for money.
- **Why server-side authorization?** Frontend state is untrusted and can be
  bypassed; ownership and role checks belong at the API boundary.
