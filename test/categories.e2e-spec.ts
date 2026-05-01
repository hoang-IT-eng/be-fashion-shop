import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';

describe('Categories (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let adminToken: string;
  let categoryId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    dataSource = moduleFixture.get(DataSource);
    await dataSource.query('DELETE FROM users');
    await dataSource.query('DELETE FROM categories');

    // Tạo admin và login
    await request(app.getHttpServer())
      .post('/auth/seed-admin')
      .send({ secret: process.env.ADMIN_SEED_SECRET ?? 'dev-secret-2026' });

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@fashionshop.com', password: 'Admin@123' });

    adminToken = (loginRes.body as { accessToken: string }).accessToken;
  });

  afterAll(async () => {
    await dataSource.query('DELETE FROM categories');
    await dataSource.query('DELETE FROM users');
    await app.close();
  });

  describe('POST /categories (admin)', () => {
    it('should create category', async () => {
      const res = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Áo' })
        .expect(201);

      const body = res.body as { id: number; name: string; isActive: boolean };
      expect(body.name).toBe('Áo');
      expect(body.isActive).toBe(true);
      categoryId = body.id;
    });

    it('should return 409 for duplicate name', () => {
      return request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Áo' })
        .expect(409);
    });

    it('should return 401 without token', () => {
      return request(app.getHttpServer())
        .post('/categories')
        .send({ name: 'Quần' })
        .expect(401);
    });
  });

  describe('GET /categories (public)', () => {
    it('should return active categories', async () => {
      const res = await request(app.getHttpServer()).get('/categories').expect(200);
      const body = res.body as { name: string }[];
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThan(0);
    });
  });

  describe('PUT /categories/:id (admin)', () => {
    it('should update category', async () => {
      const res = await request(app.getHttpServer())
        .put(`/categories/${categoryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Áo thun' })
        .expect(200);

      const body = res.body as { name: string };
      expect(body.name).toBe('Áo thun');
    });
  });

  describe('PATCH /categories/:id/toggle (admin)', () => {
    it('should toggle category visibility', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/categories/${categoryId}/toggle`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const body = res.body as { isActive: boolean };
      expect(body.isActive).toBe(false);
    });
  });

  describe('DELETE /categories/:id (admin)', () => {
    it('should delete category', () => {
      return request(app.getHttpServer())
        .delete(`/categories/${categoryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('should return 404 for deleted category', () => {
      return request(app.getHttpServer())
        .delete(`/categories/${categoryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });
});
