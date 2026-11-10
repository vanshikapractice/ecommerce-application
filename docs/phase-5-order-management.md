# Phase 5: Order management

## Flow

Customers submit only a shipping address. The API reads the authenticated
customer's cart, re-reads active products and current prices, atomically
decrements stock, snapshots product data into `order_items`, creates the order,
and clears the cart in one Prisma transaction. A failed stock or availability
check rolls the transaction back. Payment is represented as `UNPAID` with a
`PENDING` payment status for future integration.

Customer orders are always filtered by `userId`. Admin order routes require both
authentication and the `ADMIN` role. Cancellation is allowed only for
`PENDING` and `CONFIRMED` orders and restores stock transactionally.

## Status lifecycle

`PENDING -> CONFIRMED -> PROCESSING -> SHIPPED -> DELIVERED`

`PENDING` and `CONFIRMED` may transition to `CANCELLED`. Delivered and
cancelled orders are terminal. The backend rejects all other transitions.

## Files

| File | Responsibility |
|---|---|
| `apps/api/prisma/schema.prisma` | Order, item, status, payment and shipping snapshot models |
| `apps/api/src/modules/orders/order.validation.ts` | Zod validation for customer and admin order requests |
| `apps/api/src/modules/orders/order.repository.ts` | Transactional creation, stock changes, ownership queries and status transitions |
| `apps/api/src/modules/orders/order.controller.ts` | HTTP response and business error mapping |
| `apps/api/src/modules/orders/order.routes.ts` | Authenticated customer and ADMIN-only route registration |
| `apps/web/src/api.ts` | Typed customer order API client |
| `apps/web/src/App.tsx` | Checkout, confirmation, order list/detail and cancellation UI |
| `apps/admin/src/api.ts` | Typed admin order API client |
| `apps/admin/src/App.tsx` | Admin order listing, filters, details and status controls |
| `apps/api/tests/order-validation.test.ts` | Shipping validation regression coverage |
| `apps/api/tests/app.test.ts` | Unauthenticated order route coverage |

