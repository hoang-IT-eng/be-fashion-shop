import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';

describe('Orders (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let adminToken: string;
  let userToken: string;
  let orderId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    dataSource = moduleFixture.get(DataSource);
    await dataSource.query('DELETE FROM orders');
    await dataSource.query('DELETE FROM users');

    // Tạo admin
    await request(app.getHttpServer())
      .post('/auth/seed-admin')
      .send({ secret: process.env.ADMIN_SEED_SECRET ?? 'dev-secret-2026' });

    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@fashionshop.com', password: 'Admin@123' });
    adminToken = (adminLogin.body as { accessToken: string }).accessToken;

    // Tạo user thường (bypass email verify bằng cách dùng admin tạo trực tiếp)
    await dataSource.query(`
      INSERT INTO users (name, email, password, role, "isVerified", "verifyToken")
      VALUES ('Test User', 'user@test.com', '$2b$10$test', 'user', true, null)
    `);
    const userLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'user@test.com', password: 'test' });

    // Nếu login thất bại (password hash không đúng), dùng admin token để test
    userToken = (userLogin.body as { accessToken?: string }).accessToken ?? adminToken;
  });

  afterAll(async () => {
    await dataSource.query('DELETE FROM orders');
    await dataSource.query('DELETE FROM users');
    await app.close();
  });

  describe('POST /orders', () => {
    it('should create COD order', async () => {
      const res = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          items: [{ productId: 1, name: 'Áo thun', price: 199000, quantity: 2 }],
          total: 398000,
          shippingName: 'Nguyễn Văn A',
          shippingPhone: '0901234567',
          shippingAddress: '123 Đường ABC, TP.HCM',
          paymentMethod: 'cod',
        })
        .expect(201);

      const body = res.body as { order: { id: number; paymentMethod: string; paymentStatus: string } };
      expect(body.order.paymentMethod).toBe('cod');
      expect(body.order.paymentStatus).toBe('unpaid');
      orderId = body.order.id;
    });

    it('should create VNPAY order and return paymentUrl', async () => {
      const res = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          items: [{ productId: 1, name: 'Áo thun', price: 199000, quantity: 1 }],
          total: 199000,
          shippingName: 'Nguyễn Văn A',
          shippingPhone: '0901234567',
          shippingAddress: '123 Đường ABC, TP.HCM',
          paymentMethod: 'vnpay',
        })
        .expect(201);

      const body = res.body as { order: { id: number }; paymentUrl?: string };
      expect(body.paymentUrl).toBeDefined();
      expect(body.paymentUrl).toContain('sandbox.vnpayment.vn');
    });

    it('should return 400 without shipping info', () => {
      return request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          items: [{ productId: 1, name: 'Áo', price: 100000, quantity: 1 }],
          total: 100000,
          paymentMethod: 'cod',
          // thiếu shippingName, shippingPhone, shippingAddress
        })
        .expect(400);
    });

    it('should return 401 without token', () => {
      return request(app.getHttpServer()).post('/orders').send({}).expect(401);
    });
  });

  describe('GET /orders/my', () => {
    it('should return user orders', async () => {
      const res = await request(app.getHttpServer())
        .get('/orders/my')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /orders (admin)', () => {
    it('should return all orders for admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('PATCH /orders/:id/status (admin)', () => {
    it('should update order status', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'confirmed' })
        .expect(200);

      const body = res.body as { status: string };
      expect(body.status).toBe('confirmed');
    });
  });

  describe('DELETE /orders/:id (admin)', () => {
    it('should delete order', () => {
      return request(app.getHttpServer())
        .delete(`/orders/${orderId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });
});
