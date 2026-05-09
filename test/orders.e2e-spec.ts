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
  let orderId: number;
  let productId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    dataSource = moduleFixture.get(DataSource);
    // Xóa dữ liệu liên quan trước khi test
    await dataSource.query('DELETE FROM orders');
    await dataSource.query('DELETE FROM products');
    await dataSource.query('DELETE FROM users');

    // Tạo admin
    await request(app.getHttpServer())
      .post('/auth/seed-admin')
      .send({ secret: process.env.ADMIN_SEED_SECRET ?? 'dev-secret-2026' });

    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@fashionshop.com', password: 'Admin@123' });
    adminToken = (adminLogin.body as { accessToken: string }).accessToken;

    // Tạo product để order đối soát giá từ DB
    const productRes = await request(app.getHttpServer())
      .post('/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Áo thun test',
        price: 199000,
        stock: 100,
      })
      .expect(201);
    productId = (productRes.body as { id: number }).id;
  });

  afterAll(async () => {
    await dataSource.query('DELETE FROM orders');
    await dataSource.query('DELETE FROM products');
    await dataSource.query('DELETE FROM users');
    await app.close();
  });

  describe('POST /orders', () => {
    it('should create COD order', async () => {
      const res = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          items: [
            { productId, name: 'bị bỏ qua', price: 1, quantity: 2 },
          ],
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
          items: [
            { productId, name: 'bị bỏ qua', price: 999999, quantity: 1 },
          ],
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
          items: [{ productId, name: 'Áo', price: 100000, quantity: 1 }],
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

    it('should reject invalid transition from delivered back to pending', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          items: [{ productId, name: 'x', price: 1, quantity: 1 }],
          total: 199000,
          shippingName: 'A',
          shippingPhone: '0900000000',
          shippingAddress: 'Addr',
          paymentMethod: 'cod',
        })
        .expect(201);

      const id = (createRes.body as { order: { id: number } }).order.id;

      for (const status of ['confirmed', 'shipping', 'delivered'] as const) {
        await request(app.getHttpServer())
          .patch(`/orders/${id}/status`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ status })
          .expect(200);
      }

      await request(app.getHttpServer())
        .patch(`/orders/${id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'pending' })
        .expect(400);

      await request(app.getHttpServer())
        .delete(`/orders/${id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  describe('Stock', () => {
    it('should decrement stock after placing order', async () => {
      const lowStockRes = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Low stock item', price: 50000, stock: 10 })
        .expect(201);
      const lowId = (lowStockRes.body as { id: number }).id;

      await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          items: [{ productId: lowId, name: 'x', price: 1, quantity: 3 }],
          total: 150000,
          shippingName: 'A',
          shippingPhone: '0900000000',
          shippingAddress: 'Addr',
          paymentMethod: 'cod',
        })
        .expect(201);

      const p = await request(app.getHttpServer())
        .get(`/products/${lowId}`)
        .expect(200);
      expect((p.body as { stock: number }).stock).toBe(7);
    });

    it('should return 400 when stock is insufficient', async () => {
      const pRes = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'One left', price: 10000, stock: 1 })
        .expect(201);
      const pid = (pRes.body as { id: number }).id;

      await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          items: [{ productId: pid, name: 'x', price: 1, quantity: 2 }],
          total: 20000,
          shippingName: 'A',
          shippingPhone: '0900000000',
          shippingAddress: 'Addr',
          paymentMethod: 'cod',
        })
        .expect(400);
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
