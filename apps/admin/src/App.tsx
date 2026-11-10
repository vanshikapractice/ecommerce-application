import { useCallback, useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import {
  Alert,
  AppBar,
  Box,
  Button,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormHelperText,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material';
import {
  adminApi,
  authApi,
  getErrorMessage,
  type Category,
  type Customer,
  type AdminOrder,
  type Product,
  type ProductInput,
  type User,
  getAccessToken,
  notificationApi,
  type Notification,
} from './api';
import { NotificationList } from './components/NotificationList';

type Section =
  | 'dashboard'
  | 'products'
  | 'categories'
  | 'customers'
  | 'inventory'
  | 'orders'
  | 'notifications'
  | 'settings';
const pendingSections = new Set<Section>([]);

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [section, setSection] = useState<Section>('dashboard');
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    authApi
      .restore()
      .then(({ user: restored }) => {
        if (restored.role === 'ADMIN') setUser(restored);
        else setError('This account does not have administrator access.');
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
    }
  };
  if (loading) return <Typography sx={{ p: 4 }}>Restoring admin session…</Typography>;
  if (!user) return <Login onLogin={setUser} error={error} />;

  const selectSection = (next: Section) => {
    setSection(next);
    setDrawerOpen(false);
  };
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f5f7fb' }}>
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          width: 240,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: 240,
            boxSizing: 'border-box',
            borderRight: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
          },
        }}
      >
        <Sidebar section={section} onSelect={selectSection} />
      </Drawer>
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{ '& .MuiDrawer-paper': { width: 240 } }}
      >
        <Sidebar section={section} onSelect={selectSection} />
      </Drawer>
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <AppBar
          position="sticky"
          color="inherit"
          elevation={0}
          sx={{ borderBottom: '1px solid', borderColor: 'divider', zIndex: (theme) => theme.zIndex.drawer - 1 }}
        >
          <Toolbar sx={{ minHeight: { xs: 60, sm: 68 }, px: { xs: 1.5, sm: 3 } }}>
            <IconButton sx={{ display: { md: 'none' } }} onClick={() => setDrawerOpen(true)}>
              ☰
            </IconButton>
            <Typography variant="h6" sx={{ flexGrow: 1, color: 'text.primary', fontWeight: 700 }}>
              ShopSmart Admin
            </Typography>
            <Typography sx={{ mr: 2, display: { xs: 'none', sm: 'block' } }}>
              {user.name}
            </Typography>
            <Button onClick={logout} size="small" sx={{ whiteSpace: 'nowrap' }}>
              Log out
            </Button>
          </Toolbar>
        </AppBar>
        <Container
          component="main"
          maxWidth="xl"
          sx={{
            width: '100%',
            py: { xs: 2, sm: 3, md: 4 },
            px: { xs: 1.5, sm: 3, lg: 4 },
          }}
        >
          {error && (
            <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {pendingSections.has(section) ? (
            <PendingSection name={section} />
          ) : (
            <AdminSection section={section} onError={setError} />
          )}
        </Container>
      </Box>
    </Box>
  );
}

function Sidebar({
  section,
  onSelect,
}: {
  section: Section;
  onSelect: (section: Section) => void;
}) {
  const items: Array<[Section, string]> = [
    ['dashboard', 'Dashboard'],
    ['products', 'Products'],
    ['categories', 'Categories'],
    ['orders', 'Orders'],
    ['customers', 'Customers'],
    ['inventory', 'Inventory'],
    ['notifications', 'Notifications'],
    ['settings', 'Settings'],
  ];
  return (
    <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
      <Typography variant="h6" sx={{ px: 2, py: 2.5, fontWeight: 800, letterSpacing: '-0.02em' }}>
        ShopSmart
      </Typography>
      <List sx={{ py: 0 }}>
        {items.map(([key, label]) => (
          <ListItemButton
            key={key}
            selected={section === key}
            onClick={() => onSelect(key)}
            sx={{
              minHeight: 44,
              mb: 0.5,
              borderRadius: 1.5,
              '&.Mui-selected': {
                bgcolor: 'primary.50',
                color: 'primary.main',
                fontWeight: 700,
                '&:hover': { bgcolor: 'primary.100' },
              },
            }}
          >
            <ListItemText primary={label} />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );
}

function Login({ onLogin, error }: { onLogin: (user: User) => void; error: string }) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [message, setMessage] = useState(error);
  const [busy, setBusy] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const result = await authApi.login(form);
      if (result.user.role !== 'ADMIN') {
        await authApi.logout();
        throw new Error('This account does not have administrator access.');
      }
      onLogin(result.user);
    } catch (requestError) {
      setMessage(
        requestError instanceof Error ? requestError.message : getErrorMessage(requestError),
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Container maxWidth="sm" sx={{ py: 10 }}>
      <Paper component="form" onSubmit={submit} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Administrator sign in
        </Typography>
        <Stack spacing={2}>
          {message && <Alert severity="error">{message}</Alert>}
          <TextField
            label="Email"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <TextField
            label="Password"
            type="password"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <Button type="submit" variant="contained" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>
        </Stack>
      </Paper>
    </Container>
  );
}

function AdminSection({
  section,
  onError,
}: {
  section: Section;
  onError: (message: string) => void;
}) {
  if (section === 'dashboard') return <Dashboard onError={onError} />;
  if (section === 'products') return <Products onError={onError} />;
  if (section === 'categories') return <Categories onError={onError} />;
  if (section === 'customers') return <Customers onError={onError} />;
  if (section === 'inventory') return <Inventory onError={onError} />;
  if (section === 'orders') return <Orders onError={onError} />;
  if (section === 'notifications') return <Notifications onError={onError} />;
  return <PendingSection name={section} />;
}

/**
 * Loads persistent notifications and then listens for events addressed to this
 * admin's server-assigned Socket.IO room. Cleanup prevents duplicate listeners
 * when the section is unmounted or revisited.
 */
function Notifications({ onError }: { onError: (message: string) => void }) {
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const load = useCallback(() => notificationApi.list().then((result) => {
    setItems(result.notifications);
    setUnread(result.unreadCount);
  }).catch((error) => onError(getErrorMessage(error))), [onError]);
  useEffect(() => {
    void load();
    if (!getAccessToken()) return;
    const socket: Socket = io(import.meta.env.VITE_API_BASE_URL?.replace(/\/api\/v1$/, '') ?? 'http://localhost:4000', {
      auth: { accessToken: getAccessToken() },
      withCredentials: true,
    });
    socket.on('notification:new', (notification: Notification) => {
      setItems((current) => current.some((item) => item.id === notification.id) ? current : [notification, ...current]);
      setUnread((count) => count + 1);
    });
    return () => {
      socket.disconnect();
    };
  }, [load]);
  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1}>
        <Typography variant="h4">Notifications ({unread} unread)</Typography>
        <Button variant="outlined" disabled={!unread} onClick={() => {
          void notificationApi.markAllRead().then(() => {
            setItems((current) => current.map((item) => ({ ...item, isRead: true })));
            setUnread(0);
          });
        }}>Mark all as read</Button>
      </Stack>
      <NotificationList
        notifications={items}
        onRead={(id) => void notificationApi.markRead(id).then(() => {
          setItems((current) => current.map((item) => item.id === id ? { ...item, isRead: true } : item));
          setUnread((count) => Math.max(0, count - 1));
        })}
      />
    </Stack>
  );
}

function Orders({ onError }: { onError: (message: string) => void }) {
  const [items, setItems] = useState<AdminOrder[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState<AdminOrder | null>(null);
  const load = useCallback(() => adminApi.orders({ search, ...(status ? { status } : {}) }).then((result) => setItems(result.orders)).catch((e) => onError(getErrorMessage(e))), [onError, search, status]);
  useEffect(() => { void load(); }, [load]);
  const updateStatus = async (next: string) => {
    if (!selected) return;
    try {
      setSelected(await adminApi.updateOrderStatus(selected.id, next));
      await load();
    } catch (e) {
      onError(getErrorMessage(e));
    }
  };
  return (
    <Stack spacing={2}>
      <Typography variant="h4">Orders</Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField label="Search order or customer" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select value={status} displayEmpty onChange={(e) => setStatus(e.target.value)}>
          <MenuItem value="">All statuses</MenuItem>
          {['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}
        </Select>
      </Stack>
      <Paper sx={{ overflow: 'hidden' }}><TableContainer sx={{ overflowX: 'auto' }}><Table sx={{ minWidth: 620 }}><TableHead><TableRow><TableCell>Order</TableCell><TableCell>Customer</TableCell><TableCell>Status</TableCell><TableCell>Total</TableCell><TableCell /></TableRow></TableHead><TableBody>
        {items.map((order) => <TableRow key={order.id}><TableCell>{order.orderNumber}</TableCell><TableCell>{order.user.name}<br />{order.user.email}</TableCell><TableCell>{order.status}</TableCell><TableCell>${order.total.toFixed(2)}</TableCell><TableCell><Button onClick={() => setSelected(order)}>Details</Button></TableCell></TableRow>)}
      </TableBody></Table></TableContainer></Paper>
      {selected && <Paper sx={{ p: { xs: 1.5, sm: 2 }, overflow: 'hidden' }}><Typography variant="h6">{selected.orderNumber}</Typography><Typography sx={{ overflowWrap: 'anywhere' }}>{selected.shippingName}, {selected.shippingLine1}, {selected.shippingCity}, {selected.shippingCountry}</Typography>{selected.items.map((item) => <Typography key={item.id}>{item.productName} × {item.quantity} · ${item.lineTotal.toFixed(2)}</Typography>)}<Stack direction="row" spacing={1} mt={2} flexWrap="wrap" useFlexGap>{['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map((next) => <Button key={next} variant="outlined" disabled={selected.status === next} onClick={() => void updateStatus(next)}>{next}</Button>)}</Stack></Paper>}
    </Stack>
  );
}

function Dashboard({ onError }: { onError: (message: string) => void }) {
  const [data, setData] = useState<{ totals: Record<string, number>; recentProducts: Product[] }>();
  useEffect(() => {
    adminApi
      .stats()
      .then(setData)
      .catch((e) => onError(getErrorMessage(e)));
  }, [onError]);
  return (
    <>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, minmax(0, 1fr))',
            lg: 'repeat(5, minmax(0, 1fr))',
          },
          gap: 2,
        }}
      >
        {[
          ['Products', 'products'],
          ['Customers', 'customers'],
          ['Active products', 'activeProducts'],
          ['Low stock', 'lowStock'],
          ['Categories', 'categories'],
        ].map(([label, key]) => (
          <Paper
            key={key}
            elevation={0}
            sx={{
              p: { xs: 2, sm: 2.5 },
              minWidth: 0,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
            }}
          >
            <Typography color="text.secondary" variant="body2" fontWeight={600}>
              {label}
            </Typography>
            <Typography variant="h3" sx={{ mt: 0.5, fontSize: { xs: '2rem', sm: '2.5rem' } }}>
              {data?.totals[key] ?? '—'}
            </Typography>
          </Paper>
        ))}
      </Box>
      <Paper
        elevation={0}
        sx={{
          mt: 3,
          p: { xs: 1.5, sm: 3 },
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
        }}
      >
        <Typography variant="h6" gutterBottom>
          Recently added products
        </Typography>
        <TableContainer sx={{ overflowX: 'auto' }}><Table size="small" sx={{ minWidth: 520 }}>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Stock</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data?.recentProducts.map((product) => (
              <TableRow key={product.id}>
                <TableCell>{product.name}</TableCell>
                <TableCell>{product.category.name}</TableCell>
                <TableCell>{product.stock}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table></TableContainer>
      </Paper>
    </>
  );
}

function Products({ onError }: { onError: (message: string) => void }) {
  const [items, setItems] = useState<Product[]>([]);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const load = useCallback(() =>
    adminApi
      .products({ search: query })
      .then((data) => setItems(data.products))
      .catch((e) => onError(getErrorMessage(e))), [onError, query]);
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} spacing={1.5} mb={2}>
        <Typography variant="h4">Products</Typography>
        <Button
          variant="contained"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          Add product
        </Button>
      </Stack>
      <TextField fullWidth
        label="Search products or SKU"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        sx={{ mb: 2 }}
      />
      <Paper sx={{ overflow: 'hidden' }}>
        <TableContainer sx={{ overflowX: 'auto' }}><Table sx={{ minWidth: 700 }}>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>SKU</TableCell>
              <TableCell>Price</TableCell>
              <TableCell>Stock</TableCell>
              <TableCell>Status</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((product) => (
              <TableRow key={product.id}>
                <TableCell>{product.name}</TableCell>
                <TableCell>{product.sku}</TableCell>
                <TableCell>${product.price.toFixed(2)}</TableCell>
                <TableCell>{product.stock}</TableCell>
                <TableCell>
                  <Chip
                    label={product.isActive ? 'Active' : 'Inactive'}
                    color={product.isActive ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Button
                    onClick={() => {
                      setEditing(product);
                      setOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    color="error"
                    onClick={() =>
                      adminApi
                        .deleteProduct(product.id)
                        .then(load)
                        .catch((e) => onError(getErrorMessage(e)))
                    }
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table></TableContainer>
      </Paper>
      <ProductDialog
        key={`${editing?.id ?? 'new'}-${open}`}
        open={open}
        product={editing}
        onClose={() => setOpen(false)}
        onSaved={() => {
          setOpen(false);
          void load();
        }}
        onError={onError}
      />
    </>
  );
}

function ProductDialog({
  open,
  product,
  onClose,
  onSaved,
  onError,
}: {
  open: boolean;
  product: Product | null;
  onClose: () => void;
  onSaved: () => void;
  onError: (message: string) => void;
}) {
  type FormState = {
    name: string;
    slug: string;
    description: string;
    sku: string;
    price: string;
    stock: string;
    categoryId: string;
    imageUrl: string;
    isActive: boolean;
  };
  const [form, setForm] = useState(() =>
    product
      ? {
          name: product.name,
          slug: product.slug,
          description: product.description,
          sku: product.sku,
          price: String(product.price),
          stock: String(product.stock),
          categoryId: product.categoryId,
          imageUrl: product.imageUrl ?? '',
          isActive: product.isActive,
        }
      : {
          name: '',
          slug: '',
          description: '',
          sku: '',
          price: '0',
          stock: '0',
          categoryId: '',
          imageUrl: '',
          isActive: true,
        },
  );
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryError, setCategoryError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    adminApi
        .categories({ page: 1, pageSize: 50 })
        .then((result) => {
          if (active) setCategories(result.categories);
        })
        .catch((error) => {
          if (active) setCategoryError(getErrorMessage(error));
        });
    return () => {
        active = false;
    };
  }, []);

  const validate = () => {
    const errors: Partial<Record<keyof FormState, string>> = {};
    if (form.name.trim().length < 2) errors.name = 'Name must contain at least 2 characters.';
    if (!/^[a-z0-9-]{2,180}$/.test(form.slug))
        errors.slug = 'Use lowercase letters, numbers and hyphens.';
    if (!form.description.trim()) errors.description = 'Description is required.';
    if (!form.sku.trim()) errors.sku = 'SKU is required.';
    if (!Number.isFinite(Number(form.price)) || Number(form.price) < 0)
        errors.price = 'Price must be a non-negative number.';
    if (!Number.isInteger(Number(form.stock)) || Number(form.stock) < 0)
        errors.stock = 'Stock must be a non-negative integer.';
    if (!form.categoryId) errors.categoryId = 'Select a category.';
    if (form.imageUrl && !URL.canParse(form.imageUrl))
        errors.imageUrl = 'Enter a valid URL or leave this field empty.';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const save = async () => {
    if (saving || !validate()) return;
    setSaving(true);
    setServerError('');
    try {
        const input: ProductInput = {
          ...form,
          price: Number(form.price),
          stock: Number(form.stock),
          imageUrl: form.imageUrl.trim() || undefined,
        };
        if (product) await adminApi.updateProduct(product.id, input);
        else await adminApi.createProduct(input);
        onSaved();
    } catch (e) {
        const message = getErrorMessage(e);
        setServerError(message);
        onError(message);
    } finally {
        setSaving(false);
    }
  };
  const field = (name: keyof FormState) => ({
    error: Boolean(fieldErrors[name]),
    helperText: fieldErrors[name],
  });
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" scroll="paper">
      <DialogTitle>{product ? 'Edit product' : 'Add product'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1, minWidth: 0 }}>
          {serverError && <Alert severity="error">{serverError}</Alert>}
          {(['name', 'slug', 'description', 'sku', 'price', 'stock'] as const).map((name) => (
            <TextField
              key={name}
              label={name}
              value={form[name]}
              onChange={(e) => setForm({ ...form, [name]: e.target.value })}
              type={name === 'price' || name === 'stock' ? 'number' : 'text'}
              required
              {...field(name)}
            />
          ))}
          <FormControl required error={Boolean(fieldErrors.categoryId)}>
            <InputLabel id="product-category-label">Category</InputLabel>
            <Select
              labelId="product-category-label"
              label="Category"
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              disabled={Boolean(categoryError) || categories.length === 0}
            >
              {categories.map((category) => (
                <MenuItem key={category.id} value={category.id}>
                  {category.name}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>
              {fieldErrors.categoryId ||
                categoryError ||
                (categories.length === 0 ? 'Create a category before adding products.' : '')}
            </FormHelperText>
          </FormControl>
          <TextField
            label="Image URL (optional)"
            value={form.imageUrl}
            onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
            {...field('imageUrl')}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={save}
          variant="contained"
          disabled={saving || Boolean(categoryError) || categories.length === 0}
        >
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function Categories({ onError }: { onError: (message: string) => void }) {
  const [items, setItems] = useState<Category[]>([]);
  const [form, setForm] = useState({ name: '', slug: '' });
  const load = useCallback(() =>
    adminApi
      .categories()
      .then((data) => setItems(data.categories))
      .catch((e) => onError(getErrorMessage(e))), [onError]);
  useEffect(() => {
    void load();
  }, [load]);
  const create = async () => {
    try {
      await adminApi.createCategory(form);
      setForm({ name: '', slug: '' });
      await load();
    } catch (e) {
      onError(getErrorMessage(e));
    }
  };
  return (
    <>
      <Typography variant="h4" gutterBottom>
        Categories
      </Typography>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            label="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <TextField
            label="Slug"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
          />
          <Button variant="contained" onClick={create}>
            Create
          </Button>
        </Stack>
      </Paper>
      <Paper>
        <TableContainer sx={{ overflowX: 'auto' }}><Table sx={{ minWidth: 560 }}>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Slug</TableCell>
              <TableCell>Products</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((category) => (
              <TableRow key={category.id}>
                <TableCell>{category.name}</TableCell>
                <TableCell>{category.slug}</TableCell>
                <TableCell>{category._count?.products ?? 0}</TableCell>
                <TableCell>
                  <Button
                    color="error"
                    onClick={() =>
                      adminApi
                        .deleteCategory(category.id)
                        .then(load)
                        .catch((e) => onError(getErrorMessage(e)))
                    }
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table></TableContainer>
      </Paper>
    </>
  );
}

function Customers({ onError }: { onError: (message: string) => void }) {
  const [items, setItems] = useState<Customer[]>([]);
  useEffect(() => {
    adminApi
      .customers()
      .then((data) => setItems(data.customers))
      .catch((e) => onError(getErrorMessage(e)));
  }, [onError]);
  return (
    <>
      <Typography variant="h4" gutterBottom>
        Customers
      </Typography>
      <Paper>
        <TableContainer sx={{ overflowX: 'auto' }}><Table sx={{ minWidth: 560 }}>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Registered</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell>{customer.name}</TableCell>
                <TableCell>{customer.email}</TableCell>
                <TableCell>{new Date(customer.createdAt).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Chip
                    label={customer.isActive ? 'Active' : 'Inactive'}
                    color={customer.isActive ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table></TableContainer>
      </Paper>
    </>
  );
}

function Inventory({ onError }: { onError: (message: string) => void }) {
  const [items, setItems] = useState<
    Array<{ id: string; name: string; sku: string; stock: number; isActive: boolean }>
  >([]);
  const load = useCallback(() =>
    adminApi
      .inventory()
      .then((data) => setItems(data.inventory))
      .catch((e) => onError(getErrorMessage(e))), [onError]);
  useEffect(() => {
    void load();
  }, [load]);
  const update = async (id: string, stock: number) => {
    try {
      await adminApi.updateInventory(id, stock);
      await load();
    } catch (e) {
      onError(getErrorMessage(e));
    }
  };
  return (
    <>
      <Typography variant="h4" gutterBottom>
        Inventory
      </Typography>
      <Paper>
        <TableContainer sx={{ overflowX: 'auto' }}><Table sx={{ minWidth: 620 }}>
          <TableHead>
            <TableRow>
              <TableCell>Product</TableCell>
              <TableCell>SKU</TableCell>
              <TableCell>Stock</TableCell>
              <TableCell>Status</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.name}</TableCell>
                <TableCell>{item.sku}</TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    type="number"
                    defaultValue={item.stock}
                    onBlur={(e) => void update(item.id, Number(e.target.value))}
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={
                      item.stock === 0 ? 'Out of stock' : item.stock <= 5 ? 'Low stock' : 'In stock'
                    }
                    color={item.stock === 0 ? 'error' : item.stock <= 5 ? 'warning' : 'success'}
                    size="small"
                  />
                </TableCell>
                <TableCell>{item.isActive ? 'Active' : 'Inactive'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table></TableContainer>
      </Paper>
    </>
  );
}

function PendingSection({ name }: { name: string }) {
  return (
    <Paper sx={{ p: 4 }}>
      <Typography variant="h4" gutterBottom>
        {name[0].toUpperCase() + name.slice(1)}
      </Typography>
      <Alert severity="info">
        This section is intentionally pending because the current database has no Order, Payment, or
        Notification models. No fake records are displayed.
      </Alert>
    </Paper>
  );
}
