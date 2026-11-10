import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/common/utils/password.js';
import { env } from '../src/config/env.js';

const prisma = new PrismaClient();

async function main() {
  await prisma.systemSetting.upsert({
    where: { key: 'app_version' },
    update: { value: '0.1.0' },
    create: { key: 'app_version', value: '0.1.0' },
  });

  const electronics = await prisma.category.upsert({
    where: { slug: 'electronics' },
    update: { name: 'Electronics' },
    create: { name: 'Electronics', slug: 'electronics' },
  });
  const lifestyle = await prisma.category.upsert({
    where: { slug: 'lifestyle' },
    update: { name: 'Lifestyle' },
    create: { name: 'Lifestyle', slug: 'lifestyle' },
  });
  await prisma.product.upsert({
    where: { sku: 'SM-HEADPHONES-001' },
    update: {},
    create: {
      name: 'Studio Wireless Headphones',
      slug: 'studio-wireless-headphones',
      description: 'Comfortable wireless headphones with clear sound for work and travel.',
      sku: 'SM-HEADPHONES-001',
      price: 129.99,
      stock: 24,
      categoryId: electronics.id,
      imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e',
    },
  });
  await prisma.product.upsert({
    where: { sku: 'SM-BOTTLE-001' },
    update: {},
    create: {
      name: 'Insulated Travel Bottle',
      slug: 'insulated-travel-bottle',
      description: 'Reusable stainless steel bottle that keeps drinks cold or hot.',
      sku: 'SM-BOTTLE-001',
      price: 34.5,
      stock: 48,
      categoryId: lifestyle.id,
      imageUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8',
    },
  });

  const seedAdminValues = [env.SEED_ADMIN_NAME, env.SEED_ADMIN_EMAIL, env.SEED_ADMIN_PASSWORD];
  if (seedAdminValues.some((value) => value === undefined)) {
    if (seedAdminValues.some((value) => value !== undefined)) {
      throw new Error(
        'SEED_ADMIN_NAME, SEED_ADMIN_EMAIL, and SEED_ADMIN_PASSWORD must be provided together.',
      );
    }
    console.log('No admin seed credentials supplied; skipping admin seed.');
    return;
  }

  await prisma.user.upsert({
    where: { email: env.SEED_ADMIN_EMAIL },
    update: {
      name: env.SEED_ADMIN_NAME,
      passwordHash: await hashPassword(env.SEED_ADMIN_PASSWORD),
      role: 'ADMIN',
      isActive: true,
    },
    create: {
      name: env.SEED_ADMIN_NAME,
      email: env.SEED_ADMIN_EMAIL,
      passwordHash: await hashPassword(env.SEED_ADMIN_PASSWORD),
      role: 'ADMIN',
    },
  });

  console.log('Database foundation seed completed.');
}

main()
  .catch((error: unknown) => {
    console.error('Database seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
