# ShopSmart API documentation

The API base URL is `/api/v1`. Protected endpoints require
`Authorization: Bearer <access-token>`. Refresh tokens are HTTP-only cookies
and are never accepted as request body data.

## Cart

| Method | Path                     | Body                                     | Result                                                    |
| ------ | ------------------------ | ---------------------------------------- | --------------------------------------------------------- |
| GET    | `/cart`                  | none                                     | Customer cart, item count, and server-calculated subtotal |
| POST   | `/cart/items`            | `{ "productId": "cuid", "quantity": 1 }` | Updated cart                                              |
| PATCH  | `/cart/items`            | `{ "productId": "cuid", "quantity": 2 }` | Updated cart                                              |
| DELETE | `/cart/items/:productId` | none                                     | `204 No Content`                                          |
| DELETE | `/cart`                  | none                                     | `204 No Content`                                          |

Products must be active and requested quantities must be positive integers
within the configured limit. Add and update operations reject quantities above
current stock with `409 INSUFFICIENT_STOCK`.

## Wishlist

| Method | Path                         | Body                      | Result                                |
| ------ | ---------------------------- | ------------------------- | ------------------------------------- |
| GET    | `/wishlist`                  | none                      | Customer wishlist and product details |
| POST   | `/wishlist/items`            | `{ "productId": "cuid" }` | Updated wishlist                      |
| DELETE | `/wishlist/items/:productId` | none                      | `204 No Content`                      |

The database composite key `(wishlistId, productId)` prevents duplicate
wishlist entries. Cart uses the equivalent `(cartId, productId)` key.

## Ownership and errors

The API derives ownership from the verified JWT subject and applies it to every
cart and wishlist query. It does not expose a customer ID parameter for these
resources, preventing cross-customer access. Errors use the existing response
shape:

```json
{
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "Only 2 units are available.",
    "requestId": "request-correlation-id"
  }
}
```

## Administrative APIs

Every administrative endpoint requires a valid access token whose role is
`ADMIN`. Customer tokens receive `403 FORBIDDEN`.

- `GET /admin/dashboard/stats`
- `GET /admin/products`
- `GET /admin/products/:id`
- `POST /admin/products`
- `PATCH /admin/products/:id`
- `DELETE /admin/products/:id`

Product create and update requests require `name`, `slug`, `description`, `sku`,
non-negative `price` and `stock`, and a category selected from
`GET /admin/categories`. `imageUrl` is optional: omitted, `null`, or an empty
string means no image; a non-empty value must be a valid URL. The API verifies
that the category exists and recalculates all persisted product data server-side.

## Orders

- `POST /orders` creates an order from the authenticated customer's cart.
- `GET /orders` lists the customer's orders.
- `GET /orders/:id` returns only an order owned by the authenticated customer.
- `PATCH /orders/:id/cancel` cancels eligible orders and restores stock.
- `GET /admin/orders` and `GET /admin/orders/:id` are ADMIN-only.
- `PATCH /admin/orders/:id/status` applies the server-enforced status lifecycle.

Order totals, prices, stock, ownership, and status transitions are authoritative
on the server. Shipping address and product details are snapshotted at creation.

## Payments

Payment endpoints create and verify mock-provider payments for owned orders.

## Notifications

- `GET /notifications` lists the authenticated user's notifications.
- `GET /notifications/unread-count` returns the unread count.
- `PATCH /notifications/:id/read` marks one owned notification as read.
- `PATCH /notifications/read-all` marks all owned notifications as read.

Authenticated Socket.IO clients receive `notification:new` after persistence.
The server assigns rooms from the verified JWT subject; clients cannot choose
another user's room. Persistent API retrieval remains the source of truth.

- `POST /payments/create` creates or retries payment for an owned order.
- `GET /payments/:id` retrieves an owned payment.
- `GET /orders/:id/payment` retrieves payment information for an owned order.

The request contains `orderId` and a configured payment method only. The API
derives the amount from the stored order. With the mock provider, use
`mock_card`, `mock_failure`, or `mock_cancel` to exercise each provider outcome.
Clients cannot submit `SUCCESS`; payment and order payment status are updated
only after provider verification.
- `GET /admin/categories`
- `POST /admin/categories`
- `PATCH /admin/categories/:id`
- `DELETE /admin/categories/:id`
- `GET /admin/customers`
- `GET /admin/customers/:id`
- `GET /admin/inventory`
- `PATCH /admin/inventory/:id` with `{ "stock": 10 }`

Order, payment, and notification endpoints are not exposed yet because those
business models are not present in the current Prisma schema.
