import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let adminToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    dataSource = moduleFixture.get(DataSource);
    // Xóa sạch bảng users trước khi test
    await dataSource.query('DELETE FROM users');
  });

  afterAll(async () => {
    await dataSource.query('DELETE FROM users');
    await app.close();
  });

  // ── Seed Admin ──────────────────────────────────────────
  describe('POST /auth/seed-admin', () => {
    it('should create admin with correct secret', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/seed-admin')
        .send({ secret: process.env.ADMIN_SEED_SECRET ?? 'dev-secret-2026' })
        .expect(201);

      const body = res.body as { message: string; email: string };
      expect(body.message).toMatch(/thành công|tồn tại/);
      expect(body.email).toBe('admin@fashionshop.com');
    });

    it('should return 403 with wrong secret', () => {
      return request(app.getHttpServer())
        .post('/auth/seed-admin')
        .send({ secret: 'wrong-secret' })
        .expect(403);
    });
  });

  // ── Login ───────────────────────────────────────────────
  describe('POST /auth/login', () => {
    it('should login as admin and return accessToken', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@fashionshop.com', password: 'Admin@123' })
        .expect(201);

      const body = res.body as { accessToken: string; user: { role: string } };
      expect(body.accessToken).toBeDefined();
      expect(body.user.role).toBe('admin');
      adminToken = body.accessToken;
    });

    it('should return 401 with wrong password', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@fashionshop.com', password: 'wrongpass' })
        .expect(401);
    });

    it('should return 401 with non-existent email', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'notfound@gmail.com', password: '123456' })
        .expect(401);
    });
  });

  // ── Register ────────────────────────────────────────────
  describe('POST /auth/register', () => {
    it('should return 400 with invalid email', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({ name: 'Test', email: 'not-an-email', password: '123456' })
        .expect(400);
    });

    it('should return 400 with short password', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({ name: 'Test', email: 'test@gmail.com', password: '123' })
        .expect(400);
    });
  });

  // ── Protected routes ────────────────────────────────────
  describe('GET /users (admin only)', () => {
    it('should return 401 without token', () => {
      return request(app.getHttpServer()).get('/users').expect(401);
    });

    it('should return 200 with admin token', () => {
      return request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });
});
