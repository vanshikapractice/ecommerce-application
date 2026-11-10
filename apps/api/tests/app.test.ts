import { Prisma } from '@prisma/client';
import { jest } from '@jest/globals';
import request from 'supertest';

process.env.DATABASE_URL = 'mysql://test:test@localhost:3306/ecommerce_platform';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-that-is-at-least-32-characters';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-that-is-at-least-32-characters';

const queryRaw = jest.fn();

const jestWithEsm = jest as typeof jest & {
  unstable_mockModule: (moduleName: string, factory: () => unknown) => void;
};

jestWithEsm.unstable_mockModule('../src/database/prisma.js', () => ({
  prisma: {
    $queryRaw: queryRaw,
    $disconnect: jest.fn(),
  },
}));

let app: typeof import('../src/app.js').app;

describe('API foundation', () => {
  beforeAll(async () => {
    ({ app } = await import('../src/app.js'));
  });

  beforeEach(() => {
    queryRaw.mockReset();
  });

  it('returns a request ID and healthy response when the database is available', async () => {
    queryRaw.mockResolvedValue([{ 1: 1 }]);

    const response = await request(app).get('/api/v1/health');

    expect(response.status).toBe(200);
    expect(response.headers['x-request-id']).toBeTruthy();
    expect(response.body).toMatchObject({
      status: 'ok',
      service: 'api',
    });
  });

  it('returns a safe 503 response when database initialization fails', async () => {
    queryRaw.mockRejectedValue(
      new Prisma.PrismaClientInitializationError('Database unavailable', '6.19.3'),
    );

    const response = await request(app).get('/api/v1/health');

    expect(response.status).toBe(503);
    expect(response.body.error).toMatchObject({
      code: 'DATABASE_UNAVAILABLE',
      message: 'The database is temporarily unavailable.',
    });
    expect(response.body.error.requestId).toBe(response.headers['x-request-id']);
  });

  it('returns a structured 404 response for unknown routes', async () => {
    const response = await request(app).get('/api/v1/does-not-exist');

    expect(response.status).toBe(404);
    expect(response.body.error).toMatchObject({
      code: 'NOT_FOUND',
      message: 'Route GET /api/v1/does-not-exist was not found.',
    });
    expect(response.body.error.requestId).toBe(response.headers['x-request-id']);
  });

  it('protects cart and wishlist endpoints from unauthenticated access', async () => {
    const [cartResponse, wishlistResponse] = await Promise.all([
      request(app).get('/api/v1/cart'),
      request(app).get('/api/v1/wishlist'),
    ]);

    expect(cartResponse.status).toBe(401);
    expect(cartResponse.body.error.code).toBe('UNAUTHENTICATED');
    expect(wishlistResponse.status).toBe(401);
    expect(wishlistResponse.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('rejects invalid access tokens before cart validation or persistence', async () => {
    const response = await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', 'Bearer invalid-token')
      .send({ productId: 'product-1', quantity: 0 });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('INVALID_ACCESS_TOKEN');
  });

  it('protects administrative APIs from unauthenticated callers', async () => {
    const response = await request(app).get('/api/v1/admin/dashboard/stats');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('protects customer and admin order APIs from unauthenticated callers', async () => {
    const [customer, admin] = await Promise.all([
      request(app).get('/api/v1/orders'),
      request(app).get('/api/v1/admin/orders'),
    ]);
    expect(customer.status).toBe(401);
    expect(customer.body.error.code).toBe('UNAUTHENTICATED');
    expect(admin.status).toBe(401);
    expect(admin.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('protects payment APIs from unauthenticated callers', async () => {
    const [create, details] = await Promise.all([
      request(app).post('/api/v1/payments/create').send({ orderId: 'order-1', paymentMethod: 'mock_card' }),
      request(app).get('/api/v1/payments/payment-1'),
    ]);
    expect(create.status).toBe(401);
    expect(create.body.error.code).toBe('UNAUTHENTICATED');
    expect(details.status).toBe(401);
    expect(details.body.error.code).toBe('UNAUTHENTICATED');
  });
});
