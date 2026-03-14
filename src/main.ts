import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Validate DTO tự động
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Enable CORS cho frontend
  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });


  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`\n🚀 Server đang chạy tại: http://localhost:${port}`);
  console.log(`📋 API Users:     http://localhost:${port}/users`);
  console.log(`👤 API User #1:   http://localhost:${port}/users/1`);
  console.log(`🌐 Frontend:      http://localhost:${port}/users\n`);
}
bootstrap();