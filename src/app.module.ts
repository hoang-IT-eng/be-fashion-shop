import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { User } from './users/user.entity';

@Module({
  imports: [
    // Load .env
    ConfigModule.forRoot({ isGlobal: true }),

    // PostgreSQL via TypeORM
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (cfg: ConfigService) => {
        const databaseUrl = cfg.get<string>('DATABASE_URL');
        const isProduction = cfg.get('NODE_ENV') === 'production';
        if (databaseUrl) {
          // Render cung cấp DATABASE_URL dạng connection string
          return {
            type: 'postgres',
            url: databaseUrl,
            entities: [User],
            synchronize: true, // bật đồng bộ để tự tao bảng trên Render
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
          entities: [User],
          synchronize: true,
          logging: false,
        };
      },
      inject: [ConfigService],
    }),

    // Serve static frontend from /public
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      serveRoot: '/',
      exclude: ['/api*', '/users*'],
    }),

    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
