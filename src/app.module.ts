import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ProductsModule } from './products/products.module';
import { User } from './users/user.entity';
import { Product } from './products/product.entity';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ReviewsModule } from './reviews/reviews.module';
import { CategoriesModule } from './categories/categories.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { ProductVariant } from './products/product-variant.entity';
import { Review } from './reviews/review.entity';
import { CartItem } from './cart/cart.entity';
import { Order } from './orders/order.entity';
import { Category } from './categories/category.entity';
import { AiChatModule } from './ai-chat/ai-chat.module';
import { ChatSession } from './ai-chat/entities/chat-session.entity';
import { ChatMessage } from './ai-chat/entities/chat-message.entity';
import { StyleProfile } from './ai-chat/entities/style-profile.entity';
import { CacheModule } from './cache/cache.module';
import { HealthModule } from './health/health.module';

const ENTITIES = [
  User,
  Product,
  ProductVariant,
  CartItem,
  Order,
  Review,
  Category,
  ChatSession,
  ChatMessage,
  StyleProfile,
];

/**
 * Schema sync flag.
 * Default true for free-tier / local DX (no migration runner required yet).
 * Set TYPEORM_SYNCHRONIZE=false once you adopt migrations (see src/migrations/README.md).
 * synchronize never drops columns/tables unexpectedly for additive changes, but
 * still avoid relying on it for production schema ownership long-term.
 */
function resolveSynchronize(cfg: ConfigService): boolean {
  const raw = cfg.get<string>('TYPEORM_SYNCHRONIZE');
  if (raw === undefined || raw === null || raw === '') return true;
  return !['false', '0', 'no', 'off'].includes(raw.toLowerCase());
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CacheModule,

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (cfg: ConfigService) => {
        const databaseUrl = cfg.get<string>('DATABASE_URL');
        const isProduction = cfg.get('NODE_ENV') === 'production';
        const synchronize = resolveSynchronize(cfg);
        if (databaseUrl) {
          return {
            type: 'postgres' as const,
            url: databaseUrl,
            entities: ENTITIES,
            synchronize,
            ssl: isProduction ? { rejectUnauthorized: false } : false,
            logging: false,
          };
        }
        return {
          type: 'postgres' as const,
          host: cfg.get<string>('DB_HOST', 'localhost'),
          port: parseInt(cfg.get<string>('DB_PORT', '5432'), 10),
          username: cfg.get<string>('DB_USERNAME', 'postgres'),
          password: cfg.get<string>('DB_PASSWORD', '1234'),
          database: cfg.get<string>('DB_NAME', 'fashion_shop'),
          entities: ENTITIES,
          synchronize,
          logging: false,
        };
      },
      inject: [ConfigService],
    }),

    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      serveRoot: '/',
      exclude: ['/api*', '/users*', '/auth*', '/health*', '/ready*', '/products*', '/categories*'],
    }),

    UsersModule,
    AuthModule,
    ProductsModule,
    CartModule,
    OrdersModule,
    DashboardModule,
    ReviewsModule,
    CategoriesModule,
    AiChatModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
