# Phase 6: Payment integration

## Architecture

Payments use a provider boundary so checkout does not depend on a specific
gateway. `PaymentProvider` defines creation, verification, failure handling,
and refund operations. `payment.factory.ts` selects the configured provider;
the current provider is `MockPaymentProvider`. A future Razorpay provider can
implement the same interface and be selected through `PAYMENT_PROVIDER`
without changing order or checkout code.

The client sends an order ID and a payment option, never an amount or final
status. The service loads the owned order and its server-calculated total,
rejects cancelled/already-paid orders, creates or retries a pending payment,
asks the provider to simulate the result, and updates payment plus order
payment status transactionally. Mock options are `mock_card`, `mock_failure`,
and `mock_cancel`.

## Lifecycle and consistency

Payment statuses are `PENDING`, `PROCESSING`, `SUCCESS`, `FAILED`, `CANCELLED`,
and `REFUNDED`; an order starts `UNPAID`. Successful payment changes the order
to `SUCCESS`; failure or cancellation never marks it paid. Failed and
cancelled payments can be retried through the same create endpoint. A unique
payment per order makes retries update the existing record rather than create
duplicates. Paid orders cannot be cancelled because refunds are not yet
implemented in the mock workflow.

## Files

| File | Responsibility |
|---|---|
| `apps/api/prisma/schema.prisma` | Payment lifecycle enum and payment persistence model |
| `apps/api/prisma/migrations/20261031172253_payments/migration.sql` | Additive MySQL payment migration |
| `apps/api/src/config/env.ts` | Provider and currency configuration |
| `apps/api/src/modules/payments/payment.provider.ts` | Provider interface |
| `apps/api/src/modules/payments/mock-payment.provider.ts` | Controlled mock success/failure/cancellation |
| `apps/api/src/modules/payments/payment.factory.ts` | Provider selection |
| `apps/api/src/modules/payments/payment.repository.ts` | Ownership queries and transactional status updates |
| `apps/api/src/modules/payments/payment.service.ts` | Server-side amount, order eligibility and provider orchestration |
| `apps/api/src/modules/payments/payment.validation.ts` | Payment request validation |
| `apps/api/src/modules/payments/payment.controller.ts` | Payment HTTP response mapping |
| `apps/api/src/modules/payments/payment.routes.ts` | Authenticated payment route registration |
| `apps/api/src/modules/payments/payment.controller.ts` | Payment create, detail, and order-payment HTTP handlers |
| `apps/api/src/modules/payments/payment.validation.ts` | Validates owned order ID and supported mock payment methods |
| `apps/api/src/modules/orders/order.routes.ts` | Customer order-payment lookup route |
| `apps/api/src/app.ts` | Mounts customer payment and order-payment routes |
| `apps/api/.env.example` | Documents mock provider and currency configuration |
| `apps/web/src/api.ts` | Typed payment client |
| `apps/web/src/App.tsx` | Payment selection, result display and retry action |
| `apps/api/tests/payment-provider.test.ts` | Mock provider outcome coverage |
| `apps/api/tests/app.test.ts` | Payment authentication coverage |
| `apps/api/tests/payment-provider.test.ts` | Provider outcome and unknown-reference coverage |
