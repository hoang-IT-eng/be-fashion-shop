# Fashion Shop / TheBasic — NestJS API (`be-fashion-shop`)

Backend for TheBasic fashion shop. Free-tier friendly (Plan B): external Postgres (`DATABASE_URL`), optional Redis, Cloudinary CDN. See **[DEPLOY.md](./DEPLOY.md)** for Docker Compose and Azure App Service F1.

## Quick start

```bash
cp .env.example .env
npm ci
npm run start:dev
```

Or full local stack:

```bash
docker compose up --build
DATABASE_URL=postgres://postgres:postgres@localhost:5432/fashion_shop npm run seed
```

- API: `http://localhost:3000`
- Swagger: `http://localhost:3000/api/docs`
- Liveness: `GET /health`
- Readiness: `GET /ready`

## Seed data

Idempotent catalog seed (categories, ~26 products + size/color variants, reviews, users):

```bash
npm run seed
```

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@fashionshop.com` | `Admin@123` |
| Demo user | `demo@fashionshop.com` | `Demo@123` |
| Demo user | `lan@fashionshop.com` | `Demo@123` |

Admin-only bootstrap (unchanged): `POST /auth/seed-admin` with `{ "secret": "<ADMIN_SEED_SECRET>" }`.

## Scripts

```bash
npm run start:dev   # watch mode
npm run build
npm run start:prod
npm run seed
npm run test
npm run test:e2e
```

## Config highlights

- `DATABASE_URL` — Neon / Render / any Postgres (preferred on Azure)
- `REDIS_URL` — optional; omit on Azure F1 for graceful no-cache mode
- `TYPEORM_SYNCHRONIZE` — default `true` (see `src/migrations/README.md`)
- Cloudinary — image upload + `CloudinaryService.getOptimizedUrl()`

## License

UNLICENSED / private course project.
