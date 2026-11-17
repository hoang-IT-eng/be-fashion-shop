/**
 * Idempotent seed for ENIGMA (`be-fashion-shop`).
 * Usage: npm run seed
 *
 * Seeds users, categories, luxury grails + SKU variants, reviews, live auctions + bids,
 * mystery boxes, vouchers (including ENIGMA15), concierge requests, and sample orders.
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
import { AuctionLot, AuctionStatus } from '../auctions/auction-lot.entity';
import { AuctionBid } from '../auctions/auction-bid.entity';
import { MysteryBox } from '../mystery-boxes/mystery-box.entity';
import { ConciergeRequest } from '../concierge/concierge-request.entity';
import { Voucher } from '../vouchers/voucher.entity';
import {
  SEED_AUCTIONS,
  SEED_CATEGORIES,
  SEED_CONCIERGE,
  SEED_MYSTERY_BOXES,
  SEED_PRODUCTS,
  SEED_REVIEWS,
  SEED_SAMPLE_ORDERS,
  SEED_USERS,
  SEED_VOUCHERS,
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
    AuctionLot,
    AuctionBid,
    MysteryBox,
    ConciergeRequest,
    Voucher,
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
  console.log('Connected. Seeding ENIGMA Vault (idempotent)...');

  const userRepo = ds.getRepository(User);
  const categoryRepo = ds.getRepository(Category);
  const productRepo = ds.getRepository(Product);
  const variantRepo = ds.getRepository(ProductVariant);
  const reviewRepo = ds.getRepository(Review);
  const auctionRepo = ds.getRepository(AuctionLot);
  const bidRepo = ds.getRepository(AuctionBid);
  const mysteryRepo = ds.getRepository(MysteryBox);
  const voucherRepo = ds.getRepository(Voucher);
  const conciergeRepo = ds.getRepository(ConciergeRequest);
  const orderRepo = ds.getRepository(Order);

  // 1. Users
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

  // 2. Categories
  for (const c of SEED_CATEGORIES) {
    const existing = await categoryRepo.findOneBy({ name: c.name });
    if (existing) continue;
    await categoryRepo.save(
      categoryRepo.create({
        name: c.name,
        imageUrl: c.imageUrl,
        isActive: true,
      }),
    );
    console.log(`  + category ${c.name}`);
  }

  // 3. Products + SKU Variants
  for (const p of SEED_PRODUCTS) {
    let product = await productRepo.findOne({
      where: { name: p.name },
      relations: ['variants'],
    });
    if (!product) {
      product = await productRepo.save(
        productRepo.create({
          name: p.name,
          brand: p.brand,
          releaseType: p.releaseType,
          condition: p.condition,
          authenticityCode: p.authenticityCode,
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
    }

    for (const v of p.variants) {
      const sku = `ENG-${product.id}-${v.size}-${v.color}`
        .replace(/[^a-zA-Z0-9-]/g, '')
        .toUpperCase();
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

  // 4. Reviews
  for (const r of SEED_REVIEWS) {
    const user = await userRepo.findOneBy({ email: r.userEmail });
    const product = await productRepo.findOneBy({ name: r.productName });
    if (!user || !product) continue;
    const existing = await reviewRepo.findOne({
      where: { userId: user.id, productId: product.id },
    });
    if (existing) continue;
    await reviewRepo.save(
      reviewRepo.create({
        userId: user.id,
        productId: product.id,
        rating: r.rating,
        comment: r.comment,
      }),
    );
    console.log(`  + review ${r.userEmail} -> ${r.productName}`);
  }

  // 5. Live Grail Auctions + Bids
  for (const a of SEED_AUCTIONS) {
    const existing = await auctionRepo.findOneBy({ title: a.title });
    if (existing) continue;
    const endsAt = new Date(Date.now() + a.hoursFromNow * 3600 * 1000);
    const savedLot = await auctionRepo.save(
      auctionRepo.create({
        title: a.title,
        subtitle: a.subtitle,
        imageUrl: a.imageUrl,
        startingBid: a.startingBid,
        currentBid: a.currentBid,
        minIncrement: a.minIncrement,
        reservePrice: a.reservePrice,
        bidCount: a.bids.length,
        endsAt,
        status: AuctionStatus.LIVE,
      }),
    );
    for (const b of a.bids) {
      await bidRepo.save(
        bidRepo.create({
          auctionId: savedLot.id,
          userId: null,
          bidderAlias: b.bidderAlias,
          amount: b.amount,
          triggeredExtension: false,
        }),
      );
    }
    console.log(`  + auction ${a.title}`);
  }

  // 6. Mystery Boxes
  for (const box of SEED_MYSTERY_BOXES) {
    const existing = await mysteryRepo.findOneBy({ tierSlug: box.tierSlug });
    if (existing) continue;
    await mysteryRepo.save(
      mysteryRepo.create({
        tierSlug: box.tierSlug,
        name: box.name,
        subtitle: box.subtitle,
        description: box.description,
        price: box.price,
        guaranteedMinValue: box.guaranteedMinValue,
        itemCount: box.itemCount,
        imageUrl: box.imageUrl,
        archetypeMatch: [...box.archetypeMatch],
        possibleDrops: box.possibleDrops.map((d) => ({
          title: d.title,
          rarity: d.rarity,
          odds: d.odds,
        })),
        isActive: true,
      }),
    );
    console.log(`  + mystery box ${box.name}`);
  }

  // 7. Vouchers
  for (const v of SEED_VOUCHERS) {
    const existing = await voucherRepo.findOneBy({ code: v.code });
    if (existing) continue;
    await voucherRepo.save(
      voucherRepo.create({
        code: v.code,
        description: v.description,
        discountType: v.discountType,
        discountValue: v.discountValue,
        minOrderAmount: v.minOrderAmount,
        maxDiscountAmount: v.maxDiscountAmount,
        usageLimit: v.usageLimit,
        isSecretInitiation: v.isSecretInitiation,
        isActive: true,
      }),
    );
    console.log(`  + voucher ${v.code}`);
  }

  // 8. Concierge Sourcing Tickets
  for (const c of SEED_CONCIERGE) {
    const existing = await conciergeRepo.findOneBy({ itemName: c.itemName });
    if (existing) continue;
    const user = await userRepo.findOneBy({ email: c.requesterEmail });
    await conciergeRepo.save(
      conciergeRepo.create({
        userId: user?.id ?? null,
        requesterName: c.requesterName,
        requesterEmail: c.requesterEmail,
        itemName: c.itemName,
        brand: c.brand,
        size: c.size,
        targetPrice: c.targetPrice,
        marketEstimate: Math.round(c.targetPrice * 1.14),
        notes: c.notes,
        status: c.status,
        counterOfferPrice:
          'counterOfferPrice' in c ? c.counterOfferPrice : null,
        adminNotes: 'adminNotes' in c ? c.adminNotes : null,
      }),
    );
    console.log(`  + concierge ${c.itemName}`);
  }

  // 9. Sample Orders (if none exist yet)
  const existingOrderCount = await orderRepo.count();
  if (existingOrderCount === 0) {
    for (const o of SEED_SAMPLE_ORDERS) {
      const user = await userRepo.findOneBy({ email: o.userEmail });
      const product = await productRepo.findOneBy({ name: o.productName });
      if (!user || !product) continue;
      const price = Number(product.price);
      await orderRepo.save(
        orderRepo.create({
          userId: user.id,
          items: [
            {
              productId: product.id,
              size: o.size,
              color: o.color,
              name: product.name,
              price,
              quantity: o.quantity,
            },
          ],
          total: price * o.quantity,
          shippingName: o.shippingName,
          shippingPhone: o.shippingPhone,
          shippingAddress: o.shippingAddress,
          paymentMethod: o.paymentMethod,
          paymentStatus: o.paymentStatus,
          status: o.status,
        }),
      );
      console.log(`  + sample order for ${o.userEmail}`);
    }
  }

  await ds.destroy();
  console.log('\nENIGMA Vault Seed complete.');
  console.log('Demo credentials:');
  console.log('  Admin: admin@fashionshop.com / Admin@123');
  console.log('  User:  demo@fashionshop.com  / Demo@123');
  console.log('  User:  lan@fashionshop.com   / Demo@123');
  console.log('  Initiation Privilege Code: ENIGMA15');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
