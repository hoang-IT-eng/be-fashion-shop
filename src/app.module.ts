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
import { Review } from './reviews/review.entity';
import { CartItem } from './cart/cart.entity';
import { Order } from './orders/order.entity';
import { Category } from './categories/category.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (cfg: ConfigService) => {
        const databaseUrl = cfg.get<string>('DATABASE_URL');
        const isProduction = cfg.get('NODE_ENV') === 'production';
        if (databaseUrl) {
          return {
            type: 'postgres',
            url: databaseUrl,
            entities: [User, Product, CartItem, Order, Review, Category],
            synchronize: true,
            ssl: isProduction ? { rejectUnauthorized: false } : false,
            logging: false,
          };
        }
        return {
          type: 'postgres',
          host: cfg.get('DB_HOST', 'localhost'),
          port: parseInt(cfg.get('DB_PORT', '5432'), 10),
          username: cfg.get('DB_USERNAME', 'postgres'),
          password: cfg.get('DB_PASSWORD', '1234'),
          database: cfg.get('DB_NAME', 'fashion_shop'),
          entities: [User, Product, CartItem, Order, Review, Category],
          synchronize: true,
          logging: false,
        };
      },
      inject: [ConfigService],
    }),

    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      serveRoot: '/',
      exclude: ['/api*', '/users*', '/auth*'],
    }),

    UsersModule,
    AuthModule,
    ProductsModule,
    CartModule,
    OrdersModule,
    DashboardModule,
    ReviewsModule,
    CategoriesModule,
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
