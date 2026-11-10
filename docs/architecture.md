# Phase 2 architecture

```mermaid
flowchart LR
  Web[Customer Vite app] --> API[Express API]
  Admin[Admin Vite app] --> API
  API --> Middleware[Security, request ID, logging]
  Middleware --> Routes[Versioned routes]
  Routes --> Prisma[Shared Prisma client]
  Prisma --> MySQL[(MySQL)]
```

The pnpm workspace keeps the customer app, admin app, API, and shared contracts
independently buildable while allowing local workspace dependencies.

## API request lifecycle

```mermaid
sequenceDiagram
  participant C as Client
  participant E as Express
  participant M as Middleware
  participant P as Prisma
  participant D as MySQL

  C->>E: HTTP request
  E->>M: Helmet, request ID, logging, CORS
  M->>P: Route database query
  P->>D: SQL
  D-->>P: Result or error
  P-->>E: Result
  E-->>C: JSON response
```

Unknown routes and errors flow through the centralized error handler, which
returns safe structured responses and a correlation ID. The health endpoint
performs a lightweight database query and returns `503 DATABASE_UNAVAILABLE`
when Prisma cannot initialize.

## Cart and wishlist flow

Cart and wishlist routes are mounted under `/api/v1` and require the access
token issued by authentication. The authenticated subject is the only owner
identifier accepted by the repositories; clients cannot provide a different
customer ID.

```mermaid
sequenceDiagram
  participant W as Customer app
  participant A as Auth middleware
  participant R as Cart/Wishlist repository
  participant DB as MySQL

  W->>A: Bearer access token + product action
  A->>R: request.auth.sub
  R->>DB: Scoped collection query or transaction
  DB-->>R: Product rows, stock, and prices
  R-->>W: Recalculated collection response
```

Cart totals use current database prices and quantities. Composite unique keys
make adding an existing product idempotent instead of creating duplicate rows.

## Admin management flow

The admin app uses the same session mechanism, but administrative routes add a
server-side `ADMIN` role check. Product, category, customer, and inventory
queries use selective fields and database pagination. Password hashes and
refresh-token records are never selected for customer management responses.
For a file-by-file explanation of the current implementation and its actual
customer/admin workflows, see [codebase-learning-guide.md](./codebase-learning-guide.md).
