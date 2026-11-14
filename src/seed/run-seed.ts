/**
 * Idempotent seed for Fashion Shop / TheBasic.
 * Usage: npm run seed
 *
 * Creates categories, ~26 products + variants, 1 admin + 2 demo users, sample reviews.
 * Safe to re-run: skips existing rows by unique name/email/(user+product) keys.
 */
import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../users/user.entity';
import { Product } from '../products/product.entity';
import { ProductVariant } from '../products/product-variant.entity';
import { Category } from '../categories/category.entity';
import { Review } from '../reviews/review.entity';
import { CartItem } from '../cart/cart.entity';
import { Order } from '../orders/order.entity';
import { ChatSession } from '../ai-chat/entities/chat-session.entity';
import { ChatMessage } from '../ai-chat/entities/chat-message.entity';
import { StyleProfile } from '../ai-chat/entities/style-profile.entity';
import {
  SEED_CATEGORIES,
  SEED_PRODUCTS,
  SEED_REVIEWS,
  SEED_USERS,
} from './seed-data';

loadEnv();

function buildDataSource(): DataSource {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  const isProduction = process.env.NODE_ENV === 'production';
  const syncRaw = process.env.TYPEORM_SYNCHRONIZE;
  const synchronize =
    syncRaw === undefined || syncRaw === ''
      ? true
      : !['false', '0', 'no', 'off'].includes(syncRaw.toLowerCase());

  const entities = [
    User,
    Product,
    ProductVariant,
    Category,
    Review,
    CartItem,
    Order,
    ChatSession,
    ChatMessage,
    StyleProfile,
  ];

  if (databaseUrl) {
    return new DataSource({
      type: 'postgres',
      url: databaseUrl,
      entities,
      synchronize,
      ssl: isProduction ? { rejectUnauthorized: false } : false,
      logging: false,
    });
  }

  return new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || '1234',
    database: process.env.DB_NAME || 'fashion_shop',
    entities,
    synchronize,
    logging: false,
  });
}

async function seed() {
  const ds = buildDataSource();
  await ds.initialize();
  console.log('Connected. Seeding (idempotent)...');

  const userRepo = ds.getRepository(User);
  const categoryRepo = ds.getRepository(Category);
  const productRepo = ds.getRepository(Product);
  const variantRepo = ds.getRepository(ProductVariant);
  const reviewRepo = ds.getRepository(Review);

  // Users
  for (const u of SEED_USERS) {
    const existing = await userRepo.findOneBy({ email: u.email });
    if (existing) {
      console.log(`  skip user ${u.email}`);
      continue;
    }
    const hashed = await bcrypt.hash(u.password, 10);
    await userRepo.save(
      userRepo.create({
        name: u.name,
        email: u.email,
        password: hashed,
        role: u.role === 'admin' ? UserRole.ADMIN : UserRole.USER,
        isVerified: true,
        verifyToken: null,
      }),
    );
    console.log(`  + user ${u.email}`);
  }

  // Categories
  for (const c of SEED_CATEGORIES) {
    const existing = await categoryRepo.findOneBy({ name: c.name });
    if (existing) {
      console.log(`  skip category ${c.name}`);
      continue;
    }
    await categoryRepo.save(
      categoryRepo.create({
        name: c.name,
        imageUrl: c.imageUrl,
        isActive: true,
      }),
    );
    console.log(`  + category ${c.name}`);
  }

  // Products + variants
  for (const p of SEED_PRODUCTS) {
    let product = await productRepo.findOne({
      where: { name: p.name },
      relations: ['variants'],
    });
    if (!product) {
      product = await productRepo.save(
        productRepo.create({
          name: p.name,
          description: p.description,
          price: p.price,
          stock: p.stock,
          category: p.category,
          imageUrl: p.imageUrl,
          sizes: p.sizes,
          colors: p.colors,
          isActive: true,
        }),
      );
      console.log(`  + product ${p.name}`);
    } else {
      console.log(`  skip product ${p.name}`);
    }

    for (const v of p.variants) {
      const sku = `${product.id}-${v.size}-${v.color}`.replace(/\s+/g, '');
      const existingVariant = await variantRepo.findOne({
        where: { productId: product.id, size: v.size, color: v.color },
      });
      if (existingVariant) continue;
      await variantRepo.save(
        variantRepo.create({
          productId: product.id,
          size: v.size,
          color: v.color,
          stock: v.stock,
          sku,
        }),
      );
    }
  }

  // Reviews
  for (const r of SEED_REVIEWS) {
    const user = await userRepo.findOneBy({ email: r.userEmail });
    const product = await productRepo.findOneBy({ name: r.productName });
    if (!user || !product) {
      console.log(
        `  skip review (${r.userEmail} / ${r.productName}) — missing refs`,
      );
      continue;
    }
    const existing = await reviewRepo.findOne({
      where: { userId: user.id, productId: product.id },
    });
    if (existing) {
      console.log(`  skip review ${r.userEmail} → ${r.productName}`);
      continue;
    }
    await reviewRepo.save(
      reviewRepo.create({
        userId: user.id,
        productId: product.id,
        rating: r.rating,
        comment: r.comment,
      }),
    );
    console.log(`  + review ${r.userEmail} → ${r.productName}`);
  }

  await ds.destroy();
  console.log('\nSeed complete.');
  console.log('Demo credentials:');
  console.log('  admin@fashionshop.com / Admin@123');
  console.log('  demo@fashionshop.com  / Demo@123');
  console.log('  lan@fashionshop.com   / Demo@123');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
