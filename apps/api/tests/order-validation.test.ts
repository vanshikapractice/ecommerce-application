import { createOrderSchema } from '../src/modules/orders/order.validation.js';

describe('order request validation', () => {
  const address = {
    name: 'Customer Example',
    phone: '1234567890',
    line1: '1 Main Street',
    city: 'Mumbai',
    state: 'MH',
    postalCode: '400001',
    country: 'India',
  };

  it('accepts a complete shipping address', () => {
    expect(createOrderSchema.safeParse({ body: { shippingAddress: address }, params: {}, query: {} }).success).toBe(true);
  });

  it('rejects incomplete shipping data', () => {
    expect(createOrderSchema.safeParse({ body: { shippingAddress: { ...address, postalCode: '' } }, params: {}, query: {} }).success).toBe(false);
  });
});
