# Deploy — Fashion Shop / TheBasic API (Plan B · $0 Azure credit)

Free-tier friendly. **No** Azure Cache for Redis, **no** Azure Database for PostgreSQL requirement, **no** ACR requirement.

## Architecture

| Piece | Choice |
| --- | --- |
| API | NestJS on **Azure App Service F1** (or local Docker) |
| Database | External free Postgres via **`DATABASE_URL`** (Neon / Render) |
| Redis | **Optional**. Local Docker only; omit `REDIS_URL` on Azure → graceful degrade |
| Images / CDN | **Cloudinary** (free tier) |

## Local with Docker Compose

```bash
cp .env.example .env
# edit JWT_SECRET, Cloudinary, etc. as needed

docker compose up --build
# API  http://localhost:3000
# Swagger http://localhost:3000/api/docs
# Postgres :5432  Redis :6379
```

Seed demo catalog (from host, against compose Postgres):

```bash
# with compose DB exposed on localhost
DATABASE_URL=postgres://postgres:postgres@localhost:5432/fashion_shop npm run seed
```

Or without Docker (Node 20 + local Postgres; Redis optional):

```bash
npm ci
cp .env.example .env
npm run start:dev
npm run seed
```

### Demo credentials (after seed)

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@fashionshop.com` | `Admin@123` |
| User | `demo@fashionshop.com` | `Demo@123` |
| User | `lan@fashionshop.com` | `Demo@123` |

Existing `POST /auth/seed-admin` (body `{ "secret": "<ADMIN_SEED_SECRET>" }`) still works for admin-only bootstrap.

## Azure App Service F1

1. Create a free Postgres on **Neon** or **Render**; copy the connection string.
2. Create App Service (Node 20 / Docker). Point to this repo or push the built image from CI (GHCR optional — not required).
3. App settings (Application settings):

| Name | Value |
| --- | --- |
| `DATABASE_URL` | Neon/Render Postgres URL (`?sslmode=require`) |
| `JWT_SECRET` | strong secret |
| `TYPEORM_SYNCHRONIZE` | `true` until you adopt migrations |
| `CLOUDINARY_*` | from Cloudinary dashboard |
| `FE_URL` | frontend origin |
| `ADMIN_SEED_SECRET` | for seed-admin endpoint |
| `REDIS_URL` | **leave empty** on F1 (no paid Azure Cache) |

4. Health probes:
   - Liveness: `GET /health`
   - Readiness: `GET /ready` (DB required; Redis only if `REDIS_URL` set)

5. After first deploy: run seed once (Cloud Shell / local against `DATABASE_URL`):

```bash
DATABASE_URL='postgres://...' npm run seed
```

## Redis behavior

- If `REDIS_URL` is unset or Redis is unreachable: API logs **once** and continues **without cache** (no crash).
- When available, short-TTL cache on `GET /products` and `GET /categories`.

## Schema / migrations

- Default: `synchronize: true` via `TYPEORM_SYNCHRONIZE` (safe for additive free-tier DX; does not wipe data).
- Migration CLI scaffold: `src/data-source.ts`, `src/migrations/README.md`.
- Flip `TYPEORM_SYNCHRONIZE=false` only after you generate and review migrations.

## CI

GitHub Actions (`.github/workflows/ci.yml`):

- Install / build / e2e with **Postgres service**
- Optional **Redis service** (tests still pass if cache is unused)
- **Docker image build-only** (push to GHCR optional via `PUSH_GHCR=true` + `GITHUB_TOKEN`)

## Secrets checklist

`DATABASE_URL`, `JWT_SECRET`, `ADMIN_SEED_SECRET`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, plus optional mail / VNPay / Gemini keys.
