import { adminProductSchema } from '../src/modules/admin/admin.validation.js';

const validProduct = {
  name: 'Wireless Headphones',
  slug: 'wireless-headphones',
  description: 'Bluetooth wireless headphones',
  sku: 'WH-001',
  price: 2499,
  stock: 20,
  categoryId: 'category-1',
};

describe('admin product validation', () => {
  it.each([undefined, null, ''])('accepts an omitted or empty image URL: %p', (imageUrl) => {
    const result = adminProductSchema.safeParse({
      body: { ...validProduct, ...(imageUrl === undefined ? {} : { imageUrl }) },
      params: {},
      query: {},
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.body.imageUrl).toBe(imageUrl === '' ? undefined : imageUrl);
    }
  });

  it('accepts a valid image URL', () => {
    expect(
      adminProductSchema.safeParse({
        body: { ...validProduct, imageUrl: 'https://cdn.example.com/headphones.jpg' },
        params: {},
        query: {},
      }).success,
    ).toBe(true);
  });

  it('rejects invalid image URLs and invalid quantities', () => {
    const result = adminProductSchema.safeParse({
      body: { ...validProduct, imageUrl: 'not-a-url', stock: -1 },
      params: {},
      query: {},
    });

    expect(result.success).toBe(false);
  });
});
