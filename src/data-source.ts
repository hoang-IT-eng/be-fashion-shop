/**
 * TypeORM DataSource for CLI migrations.
 * Schema sync remains the default via TYPEORM_SYNCHRONIZE (see DEPLOY.md).
 */
import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import { DataSource } from 'typeorm';
import { User } from './users/user.entity';
import { Product } from './products/product.entity';
import { ProductVariant } from './products/product-variant.entity';
import { Category } from './categories/category.entity';
import { Review } from './reviews/review.entity';
import { CartItem } from './cart/cart.entity';
import { Order } from './orders/order.entity';
import { ChatSession } from './ai-chat/entities/chat-session.entity';
import { ChatMessage } from './ai-chat/entities/chat-message.entity';
import { StyleProfile } from './ai-chat/entities/style-profile.entity';
import { AuctionLot } from './auctions/auction-lot.entity';
import { AuctionBid } from './auctions/auction-bid.entity';
import { MysteryBox } from './mystery-boxes/mystery-box.entity';
import { ConciergeRequest } from './concierge/concierge-request.entity';
import { Voucher } from './vouchers/voucher.entity';

loadEnv();

const databaseUrl = process.env.DATABASE_URL?.trim();
const isProduction = process.env.NODE_ENV === 'production';

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

export default databaseUrl
  ? new DataSource({
      type: 'postgres',
      url: databaseUrl,
      entities,
      migrations: ['src/migrations/*{.ts,.js}'],
      synchronize: false,
      ssl: isProduction ? { rejectUnauthorized: false } : false,
    })
  : new DataSource({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || '1234',
      database: process.env.DB_NAME || 'fashion_shop',
      entities,
      migrations: ['src/migrations/*{.ts,.js}'],
      synchronize: false,
    });
