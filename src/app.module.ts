import { Module } from '@nestjs/common';
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
            entities: [User, Product],
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
          password: cfg.get('DB_PASSWORD', 'postgres'),
          database: cfg.get('DB_NAME', 'fashion_shop'),
          entities: [User, Product],
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
