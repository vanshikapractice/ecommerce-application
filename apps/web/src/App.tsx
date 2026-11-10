import { useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import {
  Alert,
  AppBar,
  Box,
  Button,
  Container,
  Paper,
  Stack,
  TextField,
  Toolbar,
  Typography,
  Badge,
  IconButton,
  Menu,
  MenuItem,
  Divider,
} from '@mui/material';
import {
  authApi,
  cartApi,
  catalogueApi,
  getErrorMessage,
  orderApi,
  paymentApi,
  notificationApi,
  getAccessToken,
  wishlistApi,
  type Cart,
  type Product,
  type User,
  type Wishlist,
  type Order,
  type ShippingAddress,
  type Payment,
  type Notification,
} from './api';
import { validateCredentials } from './validation';

type View = 'shop' | 'cart' | 'wishlist' | 'checkout' | 'orders' | 'order';

/**
 * Customer application shell.
 *
 * The current app uses a small explicit view state instead of active router
 * routes. Authentication, cart/order/payment state, and notification state are
 * all synchronized through the typed Axios boundary in `api.ts`.
 */
export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<View>('shop');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Cart | null>(null);
  const [wishlist, setWishlist] = useState<Wishlist | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [address, setAddress] = useState<ShippingAddress>({
    name: '', phone: '', line1: '', line2: '', city: '', state: '', postalCode: '', country: '',
  });
  const [paymentMethod, setPaymentMethod] = useState<'mock_card' | 'mock_failure' | 'mock_cancel'>('mock_card');
  const [payment, setPayment] = useState<Payment | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationAnchor, setNotificationAnchor] = useState<null | HTMLElement>(null);

  const loadCustomerData = async () => {
    try {
      const [nextCart, nextWishlist] = await Promise.all([cartApi.get(), wishlistApi.get()]);
      setCart(nextCart);
      setWishlist(nextWishlist);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  };

  useEffect(() => {
    catalogueApi
      .list()
      .then(({ products: loadedProducts }) => setProducts(loadedProducts))
      .catch((requestError) => setError(getErrorMessage(requestError)));
    authApi
      .restore()
      .then(async ({ user: restoredUser }) => {
        setUser(restoredUser);
        await loadCustomerData();
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // Notifications are fetched from MySQL-backed APIs first; Socket.IO only
    // adds low-latency updates while this authenticated session is mounted.
    if (!user || !getAccessToken()) return;
    const socket: Socket = io(import.meta.env.VITE_API_BASE_URL?.replace(/\/api\/v1$/, '') ?? 'http://localhost:4000', {
      auth: { accessToken: getAccessToken() },
      withCredentials: true,
    });
    void notificationApi.list().then((result) => setNotifications(result.notifications)).catch(() => undefined);
    socket.on('notification:new', (notification: Notification) => {
      setNotifications((current) => current.some((item) => item.id === notification.id)
        ? current
        : [notification, ...current]);
    });
    return () => {
      socket.disconnect();
    };
  }, [user]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    const validationError = validateCredentials(mode, form);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSubmitting(true);
    try {
      const result =
        mode === 'login'
          ? await authApi.login({ email: form.email, password: form.password })
          : await authApi.register(form);
      setUser(result.user);
      await loadCustomerData();
      setForm({ name: '', email: '', password: '' });
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  const addToCart = async (product: Product) => {
    if (!user) {
      setError('Sign in before adding products to your cart.');
      return;
    }
    try {
      setCart(await cartApi.add(product.id));
      setNotice(`${product.name} added to your cart.`);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  };

  const toggleWishlist = async (product: Product) => {
    if (!user) {
      setError('Sign in before using your wishlist.');
      return;
    }
    const saved = wishlist?.items.some((item) => item.product.id === product.id);
    try {
      if (saved) {
        await wishlistApi.remove(product.id);
        setWishlist(await wishlistApi.get());
      } else {
        setWishlist(await wishlistApi.add(product.id));
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
      setCart(null);
      setWishlist(null);
      setView('shop');
    }
  };

  const loadOrders = async () => {
    try {
      setOrders(await orderApi.list());
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  };
  const placeOrder = async (orderId?: string) => {
    if (Object.values(address).some((value) => !value.trim())) {
      setError('Complete every required shipping field before placing the order.');
      return;
    }
    setSubmitting(true);
    try {
      const order = orderId ? selectedOrder : await orderApi.create(address);
      if (!order) throw new Error('The order could not be prepared for payment.');
      setSelectedOrder(order);
      const result = await paymentApi.create(order.id, paymentMethod);
      setPayment(result);
      if (result.order) setSelectedOrder({ ...order, paymentStatus: result.order.paymentStatus });
      if (result.status === 'FAILED' || result.status === 'CANCELLED') {
        setError(result.failureReason ?? 'Payment was not completed.');
      } else {
        setCart(await cartApi.get());
        setNotice('Payment completed successfully.');
      }
      setView('order');
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };
  const cancelOrder = async (id: string) => {
    try {
      const updated = await orderApi.cancel(id);
      setSelectedOrder(updated);
      await loadOrders();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  };

  const cartActions = {
    update: async (productId: string, quantity: number) => {
      try {
        setCart(await cartApi.update(productId, quantity));
      } catch (requestError) {
        setError(getErrorMessage(requestError));
      }
    },
    remove: async (productId: string) => {
      try {
        await cartApi.remove(productId);
        setCart(await cartApi.get());
      } catch (requestError) {
        setError(getErrorMessage(requestError));
      }
    },
    clear: async () => {
      try {
        await cartApi.clear();
        setCart(await cartApi.get());
      } catch (requestError) {
        setError(getErrorMessage(requestError));
      }
    },
  };

  return (
    <>
      <AppBar position="static">
        <Toolbar sx={{ flexWrap: { xs: 'wrap', sm: 'nowrap' }, gap: { xs: 0.5, sm: 1 }, py: { xs: 1, sm: 0 } }}>
          <Typography variant="h6" component="h1" sx={{ flexGrow: 1, minWidth: 120 }}>
            ShopSmart
          </Typography>
          {user && (
            <Box sx={{ display: 'flex', width: { xs: '100%', sm: 'auto' }, overflowX: 'auto', justifyContent: { xs: 'flex-start', sm: 'flex-end' }, pb: { xs: 0.5, sm: 0 }, '& > button': { flexShrink: 0, whiteSpace: 'nowrap', px: { xs: 1, sm: 1.5 } } }}>
              <IconButton color="inherit" onClick={(event) => setNotificationAnchor(event.currentTarget)} aria-label="Notifications">
                <Badge color="error" badgeContent={notifications.filter((item) => !item.isRead).length}>
                  🔔
                </Badge>
              </IconButton>
              <Button color="inherit" onClick={() => setView('shop')}>
                Shop
              </Button>
              <Button color="inherit" onClick={() => setView('wishlist')}>
                Wishlist ({wishlist?.items.length ?? 0})
              </Button>
              <Button color="inherit" onClick={() => setView('cart')}>
                Cart ({cart?.itemCount ?? 0})
              </Button>
              <Button color="inherit" onClick={() => { void loadOrders(); setView('orders'); }}>
                My orders
              </Button>
              <Button color="inherit" onClick={logout}>
                Log out
              </Button>
            </Box>
          )}
          <Menu anchorEl={notificationAnchor} open={Boolean(notificationAnchor)} onClose={() => setNotificationAnchor(null)}>
            <MenuItem disabled>Notifications</MenuItem>
            <Divider />
            {!notifications.length && <MenuItem disabled>No notifications</MenuItem>}
            {notifications.slice(0, 6).map((notification) => (
              <MenuItem key={notification.id} onClick={() => {
                if (!notification.isRead) {
                  void notificationApi.markRead(notification.id);
                  setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, isRead: true } : item));
                }
                setNotificationAnchor(null);
                if (notification.relatedEntityType === 'ORDER' && notification.relatedEntityId) {
                  void orderApi.get(notification.relatedEntityId).then((order) => {
                    setSelectedOrder(order);
                    setView('order');
                  });
                }
              }} sx={{ whiteSpace: 'normal', maxWidth: 340, fontWeight: notification.isRead ? 'normal' : 'bold' }}>
                {notification.title}: {notification.message}
              </MenuItem>
            ))}
            {notifications.some((item) => !item.isRead) && <MenuItem onClick={() => {
              void notificationApi.markAllRead();
              setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
            }}>Mark all as read</MenuItem>}
          </Menu>
        </Toolbar>
      </AppBar>
      <Container component="main">
        <Box py={{ xs: 3, sm: 6 }} px={{ xs: 1, sm: 2 }} maxWidth={820} mx="auto">
          {error && (
            <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {notice && (
            <Alert severity="success" onClose={() => setNotice('')} sx={{ mb: 2 }}>
              {notice}
            </Alert>
          )}
          {loading ? (
            <Typography color="text.secondary">Restoring your session…</Typography>
          ) : !user ? (
            <Paper component="form" onSubmit={submit} sx={{ p: { xs: 2, sm: 4 } }}>
              <Typography variant="h3" component="h2" gutterBottom>
                {mode === 'login' ? 'Sign in to ShopSmart' : 'Create your account'}
              </Typography>
              <Stack spacing={2}>
                {mode === 'register' && (
                  <TextField
                    label="Full name"
                    value={form.name}
                    onChange={(event) => setForm({ ...form, name: event.target.value })}
                    required
                  />
                )}
                <TextField
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                  required
                />
                <TextField
                  label="Password"
                  type="password"
                  value={form.password}
                  onChange={(event) => setForm({ ...form, password: event.target.value })}
                  required
                  inputProps={{ minLength: 8 }}
                />
                <Button type="submit" variant="contained" disabled={submitting}>
                  {submitting ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Register'}
                </Button>
                <Button
                  type="button"
                  onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                >
                  {mode === 'login' ? 'Need an account? Register' : 'Already registered? Sign in'}
                </Button>
              </Stack>
            </Paper>
          ) : view === 'cart' ? (
            <CartView cart={cart} actions={cartActions} onCheckout={() => setView('checkout')} />
          ) : view === 'wishlist' ? (
            <WishlistView wishlist={wishlist} onRemove={toggleWishlist} onAdd={addToCart} />
          ) : view === 'checkout' ? (
            <CheckoutView address={address} setAddress={setAddress} onPlace={() => void placeOrder()} busy={submitting} cart={cart} paymentMethod={paymentMethod} setPaymentMethod={setPaymentMethod} />
          ) : view === 'orders' ? (
            <OrdersView orders={orders} onSelect={async (id) => { setSelectedOrder(await orderApi.get(id)); setView('order'); }} />
          ) : view === 'order' && selectedOrder ? (
            <OrderDetailView order={selectedOrder} payment={payment} onCancel={cancelOrder} onRetry={() => void placeOrder(selectedOrder.id)} />
          ) : (
            <>
              <Typography variant="h3" component="h2" gutterBottom>
                Welcome back, {user.name}
              </Typography>
              <Typography color="text.secondary" mb={3}>
                Browse products and save favourites for later.
              </Typography>
              <Stack spacing={2}>
                {products.map((product) => (
                  <Paper key={product.id} sx={{ p: 3 }}>
                    <ProductImage product={product} />
                    <Typography variant="h5">{product.name}</Typography>
                    <Typography color="text.secondary">{product.description}</Typography>
                    <Typography sx={{ mt: 1 }} fontWeight="bold">
                      ${product.price.toFixed(2)} · {product.stock} in stock
                    </Typography>
                    <Stack direction="row" spacing={1} mt={2}>
                      <Button
                        variant="contained"
                        onClick={() => addToCart(product)}
                        disabled={product.stock < 1}
                      >
                        Add to cart
                      </Button>
                      <Button onClick={() => toggleWishlist(product)}>
                        {wishlist?.items.some((item) => item.product.id === product.id)
                          ? 'Remove from wishlist'
                          : 'Add to wishlist'}
                      </Button>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            </>
          )}
        </Box>
      </Container>
    </>
  );
}

function CartView({
  cart,
  actions,
  onCheckout,
}: {
  cart: Cart | null;
  actions: {
    update: (id: string, quantity: number) => Promise<void>;
    remove: (id: string) => Promise<void>;
    clear: () => Promise<void>;
  };
  onCheckout: () => void;
}) {
  return (
    <Stack spacing={2}>
      <Typography variant="h3" component="h2">
        Your cart
      </Typography>
      {!cart?.items.length ? (
        <Typography color="text.secondary">Your cart is empty.</Typography>
      ) : (
        <>
          {cart.items.map((item) => (
            <Paper key={item.id} sx={{ p: 3 }}>
              <ProductImage product={item.product} />
              <Typography variant="h5">{item.product.name}</Typography>
              <Typography>
                ${item.product.price.toFixed(2)} each · Subtotal ${item.subtotal.toFixed(2)}
              </Typography>
              <Stack direction="row" spacing={1} mt={2} alignItems="center">
                <Button
                  onClick={() => void actions.update(item.product.id, item.quantity - 1)}
                  disabled={item.quantity <= 1}
                >
                  −
                </Button>
                <Typography>{item.quantity}</Typography>
                <Button
                  onClick={() => void actions.update(item.product.id, item.quantity + 1)}
                  disabled={item.quantity >= item.product.stock}
                >
                  +
                </Button>
                <Button color="error" onClick={() => void actions.remove(item.product.id)}>
                  Remove
                </Button>
              </Stack>
            </Paper>
          ))}
          <Typography variant="h5">Subtotal: ${cart.subtotal.toFixed(2)}</Typography>
          <Button color="error" variant="outlined" onClick={() => void actions.clear()}>
            Clear cart
          </Button>
          <Button variant="contained" onClick={onCheckout}>
            Proceed to checkout
          </Button>
        </>
      )}
    </Stack>
  );
}

function WishlistView({
  wishlist,
  onRemove,
  onAdd,
}: {
  wishlist: Wishlist | null;
  onRemove: (product: Product) => Promise<void>;
  onAdd: (product: Product) => Promise<void>;
}) {
  return (
    <Stack spacing={2}>
      <Typography variant="h3" component="h2">
        Your wishlist
      </Typography>
      {!wishlist?.items.length ? (
        <Typography color="text.secondary">Your wishlist is empty.</Typography>
      ) : (
        wishlist.items.map((item) => (
          <Paper key={item.id} sx={{ p: 3 }}>
            <ProductImage product={item.product} />
            <Typography variant="h5">{item.product.name}</Typography>
            <Typography>${item.product.price.toFixed(2)}</Typography>
            <Stack direction="row" spacing={1} mt={2}>
              <Button
                variant="contained"
                onClick={() => void onAdd(item.product)}
                disabled={item.product.stock < 1}
              >
                Add to cart
              </Button>
              <Button color="error" onClick={() => void onRemove(item.product)}>
                Remove
              </Button>
            </Stack>
          </Paper>
        ))
      )}
    </Stack>
  );
}

function CheckoutView({ address, setAddress, onPlace, busy, cart, paymentMethod, setPaymentMethod }: {
  address: ShippingAddress;
  setAddress: (value: ShippingAddress) => void;
  onPlace: () => void;
  busy: boolean;
  cart: Cart | null;
  paymentMethod: 'mock_card' | 'mock_failure' | 'mock_cancel';
  setPaymentMethod: (value: 'mock_card' | 'mock_failure' | 'mock_cancel') => void;
}) {
  const fields: Array<keyof ShippingAddress> = ['name', 'phone', 'line1', 'line2', 'city', 'state', 'postalCode', 'country'];
  return (
    <Stack spacing={2}>
      <Typography variant="h3">Checkout</Typography>
      <Typography>Subtotal: ${cart?.subtotal.toFixed(2) ?? '0.00'} · Shipping is free over $100.</Typography>
      {fields.map((field) => (
        <TextField key={field} label={field} required={field !== 'line2'} value={address[field] ?? ''} onChange={(event) => setAddress({ ...address, [field]: event.target.value })} />
      ))}
      <TextField select label="Payment method" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as typeof paymentMethod)} SelectProps={{ native: true }}>
        <option value="mock_card">Mock card (success)</option>
        <option value="mock_failure">Mock card (declined)</option>
        <option value="mock_cancel">Mock checkout (cancelled)</option>
      </TextField>
      <Button variant="contained" onClick={onPlace} disabled={busy || !cart?.items.length}>{busy ? 'Placing order…' : 'Place order'}</Button>
    </Stack>
  );
}

function OrdersView({ orders, onSelect }: { orders: Order[]; onSelect: (id: string) => void }) {
  return (
    <Stack spacing={2}>
      <Typography variant="h3">My orders</Typography>
      {!orders.length ? <Typography color="text.secondary">You have no orders yet.</Typography> : orders.map((order) => (
        <Paper key={order.id} sx={{ p: 2 }}>
          <Typography variant="h6">{order.orderNumber}</Typography>
          <Typography>{order.status} · ${order.total.toFixed(2)}</Typography>
          <Button onClick={() => onSelect(order.id)}>View details</Button>
        </Paper>
      ))}
    </Stack>
  );
}

function OrderDetailView({ order, payment, onCancel, onRetry }: { order: Order; payment: Payment | null; onCancel: (id: string) => void; onRetry: () => void }) {
  const cancellable = order.status === 'PENDING' || order.status === 'CONFIRMED';
  const retryable = payment?.status === 'FAILED' || payment?.status === 'CANCELLED';
  return (
    <Stack spacing={2}>
      <Typography variant="h3">Order {order.orderNumber}</Typography>
      <Typography>Status: {order.status} · Payment: {payment?.status ?? order.paymentStatus}</Typography>
      {order.items.map((item) => <Paper key={item.id} sx={{ p: 2 }}><Typography>{item.productName} × {item.quantity}</Typography><Typography>${item.lineTotal.toFixed(2)}</Typography></Paper>)}
      <Typography variant="h5">Total: ${order.total.toFixed(2)}</Typography>
      {cancellable && <Button color="error" variant="outlined" onClick={() => onCancel(order.id)}>Cancel order</Button>}
      {retryable && <Button variant="contained" onClick={onRetry}>Retry payment</Button>}
    </Stack>
  );
}

function ProductImage({ product }: { product: Product }) {
  return product.imageUrl ? (
    <Box
      component="img"
      src={product.imageUrl}
      alt={product.name}
      sx={{ width: '100%', height: 180, objectFit: 'cover', mb: 2 }}
    />
  ) : (
    <Box
      role="img"
      aria-label={`${product.name} placeholder`}
      sx={{
        width: '100%',
        height: 180,
        mb: 2,
        display: 'grid',
        placeItems: 'center',
        bgcolor: 'grey.100',
        color: 'text.secondary',
      }}
    >
      No image available
    </Box>
  );
}
