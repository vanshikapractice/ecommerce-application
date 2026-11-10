/**
 * Admin API boundary.
 *
 * Access tokens remain in memory while refresh tokens stay in the API's
 * HTTP-only cookie. This prevents the browser application from persisting a
 * reusable refresh credential in local storage.
 */
import axios from 'axios';

// Admin uses the same in-memory access-token/HTTP-only refresh-cookie contract
// as the customer app; server-side ADMIN authorization remains authoritative.
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
  if (error.response?.status !== 401 || !original || original.url?.includes('/auth/'))
    return Promise.reject(error);
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

export type Category = { id: string; name: string; slug: string; _count?: { products: number } };
export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  sku: string;
  price: number;
  stock: number;
  imageUrl: string | null;
  isActive: boolean;
  categoryId: string;
  category: Category;
};
export type Customer = {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: string;
};
export type Page = { page: number; pageSize: number; total: number; pages: number };
export type ProductInput = {
  name: string;
  slug: string;
  description: string;
  sku: string;
  price: number;
  stock: number;
  categoryId: string;
  imageUrl?: string | null;
  isActive?: boolean;
};
export type AdminOrder = {
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
  items: Array<{ id: string; productName: string; quantity: number; unitPrice: number; lineTotal: number }>;
  user: { id: string; name: string; email: string };
};

export const adminApi = {
  stats: () =>
    api
      .get<{ data: { totals: Record<string, number>; recentProducts: Product[] } }>(
        '/admin/dashboard/stats',
      )
      .then((r) => r.data.data),
  products: (params?: Record<string, string | number>) =>
    api
      .get<{ data: { products: Product[]; pagination: Page } }>('/admin/products', { params })
      .then((r) => r.data.data),
  createProduct: (input: ProductInput) =>
    api
      .post<{ data: { product: Product } }>('/admin/products', input)
      .then((r) => r.data.data.product),
  updateProduct: (id: string, input: ProductInput) =>
    api
      .patch<{ data: { product: Product } }>(`/admin/products/${id}`, input)
      .then((r) => r.data.data.product),
  deleteProduct: (id: string) => api.delete(`/admin/products/${id}`),
  categories: (params?: Record<string, string | number>) =>
    api
      .get<{ data: { categories: Category[]; pagination: Page } }>('/admin/categories', { params })
      .then((r) => r.data.data),
  createCategory: (input: { name: string; slug: string }) =>
    api
      .post<{ data: { category: Category } }>('/admin/categories', input)
      .then((r) => r.data.data.category),
  deleteCategory: (id: string) => api.delete(`/admin/categories/${id}`),
  customers: (params?: Record<string, string | number>) =>
    api
      .get<{ data: { customers: Customer[]; pagination: Page } }>('/admin/customers', { params })
      .then((r) => r.data.data),
  inventory: (params?: Record<string, string | number>) =>
    api
      .get<{
        data: {
          inventory: Array<Pick<Product, 'id' | 'name' | 'sku' | 'stock' | 'isActive'>>;
          pagination: Page;
        };
      }>('/admin/inventory', { params })
      .then((r) => r.data.data),
  updateInventory: (id: string, stock: number) => api.patch(`/admin/inventory/${id}`, { stock }),
  orders: (params?: Record<string, string | number>) =>
    api.get<{ data: { orders: AdminOrder[]; pagination: Page } }>('/admin/orders', { params }).then((r) => r.data.data),
  order: (id: string) =>
    api.get<{ data: { order: AdminOrder } }>(`/admin/orders/${id}`).then((r) => r.data.data.order),
  updateOrderStatus: (id: string, status: string) =>
    api.patch<{ data: { order: AdminOrder } }>(`/admin/orders/${id}/status`, { status }).then((r) => r.data.data.order),
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
  list: () =>
    api.get<{ data: { notifications: Notification[]; unreadCount: number } }>('/notifications').then((r) => r.data.data),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
};
