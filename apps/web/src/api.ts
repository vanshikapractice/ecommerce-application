/**
 * Customer API boundary.
 *
 * The client keeps the short-lived access token in memory only. The API owns
 * the long-lived refresh token in an HTTP-only cookie, so a page reload can
 * restore a session without exposing refresh credentials to JavaScript.
 */
import axios from 'axios';

// Access tokens are intentionally ephemeral. The refresh token stays in the
// API-managed HTTP-only cookie and is never placed in local storage.
let accessToken: string | null = null;
let refreshRequest: Promise<string> | null = null;

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api/v1',
  withCredentials: true,
});
export const getAccessToken = () => accessToken;

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

api.interceptors.response.use(undefined, async (error) => {
  const original = error.config;
  if (error.response?.status !== 401 || !original || original.url?.includes('/auth/')) {
    return Promise.reject(error);
  }
  if (!refreshRequest) {
    refreshRequest = axios
      .post<AuthResponse>('/auth/refresh', undefined, {
        baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api/v1',
        withCredentials: true,
      })
      .then((response) => {
        accessToken = response.data.data.accessToken;
        return accessToken;
      })
      .finally(() => {
        refreshRequest = null;
      });
  }
  try {
    await refreshRequest;
    original.headers.Authorization = `Bearer ${accessToken}`;
    return api(original);
  } catch {
    accessToken = null;
    return Promise.reject(error);
  }
});

export type User = {
  id: string;
  name: string;
  email: string;
  role: 'CUSTOMER' | 'ADMIN';
  isActive: boolean;
  createdAt: string;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  stock: number;
  imageUrl: string | null;
  category: { name: string; slug: string };
};

type AuthResponse = { data: { user: User; accessToken: string } };

export const getErrorMessage = (error: unknown) =>
  axios.isAxiosError<{ error?: { message?: string } }>(error)
    ? (error.response?.data.error?.message ?? 'The request could not be completed.')
    : 'The request could not be completed.';

export const authApi = {
  async restore() {
    const response = await api.post<AuthResponse>('/auth/refresh');
    accessToken = response.data.data.accessToken;
    return response.data.data;
  },
  async register(input: { name: string; email: string; password: string }) {
    const response = await api.post<AuthResponse>('/auth/register', input);
    accessToken = response.data.data.accessToken;
    return response.data.data;
  },
  async login(input: { email: string; password: string }) {
    const response = await api.post<AuthResponse>('/auth/login', input);
    accessToken = response.data.data.accessToken;
    return response.data.data;
  },
  async logout() {
    try {
      await api.post('/auth/logout');
    } finally {
      accessToken = null;
    }
  },
};

export const catalogueApi = {
  async list() {
    const response = await api.get<{
      data: { products: Product[]; pagination: { page: number; pages: number; total: number } };
    }>('/products');
    return response.data.data;
  },
};

export type CartItem = {
  id: string;
  product: Product;
  quantity: number;
  subtotal: number;
};

export type Cart = {
  id: string;
  items: CartItem[];
  itemCount: number;
  subtotal: number;
};

export type Wishlist = { id: string; items: { id: string; product: Product }[] };
export type ShippingAddress = {
  name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};
export type OrderItem = {
  id: string;
  productId: string;
  productName: string;
  productImageUrl: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};
export type Order = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  subtotal: number;
  shippingCharge: number;
  discount: number;
  total: number;
  shippingName: string;
  shippingPhone: string;
  shippingLine1: string;
  shippingLine2: string | null;
  shippingCity: string;
  shippingState: string;
  shippingPostalCode: string;
  shippingCountry: string;
  createdAt: string;
  items: OrderItem[];
  user?: { id: string; name: string; email: string };
};
export type Payment = {
  id: string;
  orderId: string;
  provider: string;
  providerPaymentReference: string | null;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: string | null;
  failureReason: string | null;
  order: { id: string; userId: string; orderNumber: string; total: number; paymentStatus: string };
};

export const cartApi = {
  async get() {
    const response = await api.get<{ data: { cart: Cart } }>('/cart');
    return response.data.data.cart;
  },
  async add(productId: string, quantity = 1) {
    const response = await api.post<{ data: { cart: Cart } }>('/cart/items', {
      productId,
      quantity,
    });
    return response.data.data.cart;
  },
  async update(productId: string, quantity: number) {
    const response = await api.patch<{ data: { cart: Cart } }>('/cart/items', {
      productId,
      quantity,
    });
    return response.data.data.cart;
  },
  remove: (productId: string) => api.delete(`/cart/items/${productId}`),
  clear: () => api.delete('/cart'),
};

export const wishlistApi = {
  async get() {
    const response = await api.get<{ data: { wishlist: Wishlist } }>('/wishlist');
    return response.data.data.wishlist;
  },
  async add(productId: string) {
    const response = await api.post<{ data: { wishlist: Wishlist } }>('/wishlist/items', {
      productId,
    });
    return response.data.data.wishlist;
  },
  remove: (productId: string) => api.delete(`/wishlist/items/${productId}`),
};

export const orderApi = {
  async create(shippingAddress: ShippingAddress) {
    const response = await api.post<{ data: { order: Order } }>('/orders', { shippingAddress });
    return response.data.data.order;
  },
  async list() {
    const response = await api.get<{ data: { orders: Order[] } }>('/orders');
    return response.data.data.orders;
  },
  async get(id: string) {
    const response = await api.get<{ data: { order: Order } }>(`/orders/${id}`);
    return response.data.data.order;
  },
  async cancel(id: string) {
    const response = await api.patch<{ data: { order: Order } }>(`/orders/${id}/cancel`);
    return response.data.data.order;
  },
};

export const paymentApi = {
  async create(orderId: string, paymentMethod: 'mock_card' | 'mock_failure' | 'mock_cancel') {
    const response = await api.post<{ data: { payment: Payment } }>('/payments/create', {
      orderId,
      paymentMethod,
    });
    return response.data.data.payment;
  },
  async getForOrder(orderId: string) {
    const response = await api.get<{ data: { payment: Payment } }>(`/orders/${orderId}/payment`);
    return response.data.data.payment;
  },
};

export type Notification = {
  id: string;
  title: string;
  message: string;
  type: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
};

export const notificationApi = {
  async list() {
    const response = await api.get<{ data: { notifications: Notification[]; unreadCount: number } }>(
      '/notifications',
    );
    return response.data.data;
  },
  async unreadCount() {
    const response = await api.get<{ data: { unreadCount: number } }>('/notifications/unread-count');
    return response.data.data.unreadCount;
  },
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
};
