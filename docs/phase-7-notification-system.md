# Phase 7: Notification system

Notifications are persisted in MySQL before they are emitted in real time.
The `Notification` record is owned by a recipient user, supports read state,
related order/payment references, pagination, and a unique dedupe key.

## API

- `GET /api/v1/notifications`
- `GET /api/v1/notifications/unread-count`
- `PATCH /api/v1/notifications/:id/read`
- `PATCH /api/v1/notifications/read-all`

All endpoints require the existing access token and scope queries to the
authenticated user. Admin users use the same protected endpoints for their
own operational notifications.

## Events and triggers

The server emits `notification:new` only after a successful database write.
Order placement, order cancellation/status changes, and payment success,
failure, or cancellation publish notifications using actual persisted IDs.
Retries use deterministic dedupe keys and cannot create duplicate records.

## Socket.IO security

Socket connections authenticate with the existing access token in the
handshake. The server chooses `user:<subject>` rooms; clients cannot select a
room or another recipient. Offline clients retrieve the persisted list when
they reconnect. Notification failures are logged explicitly and do not roll
back an already-completed order or payment operation.

The current deployment is single-server. Multiple API instances require a
shared Socket.IO adapter (for example Redis) while MySQL remains the source of
truth.

