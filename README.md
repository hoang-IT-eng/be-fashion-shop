# ENIGMA — Cult-Dark Authenticated Streetwear, Grail Auctions & Reborn Customs API (`be-fashion-shop`)

NestJS + TypeORM + PostgreSQL + Socket.IO backend powering **ENIGMA** (`fe-fashion-shop`): authenticated luxury streetwear drops, real-time Grail Auctions with `<60s` Anti-Snipe protection, 8-step **Taste Codex** Mystery Boxes, **"Find It At My Price"** Concierge sourcing, Privilege Vouchers (`ENIGMA15`), Executive Analytics, and a **Hybrid BM25 RAG + Tool-Use Generative UI AI Stylist** with seamless Zero-Key fallback.

---

## Demo Credentials

All demo accounts and secret initiation codes below are created idempotently by `npm run seed` (and mirrored in the frontend resilient demo layer):

| Role / Access | Email / Identifier | Password / Code | Notes |
| --- | --- | --- | --- |
| **Admin (Curator Desk)** | `admin@fashionshop.com` | `Admin@123` | Full access to `/admin` Executive Desk, Products/Variants, Live Auctions, Concierge & Vouchers |
| **Collector User** | `demo@fashionshop.com` | `Demo@123` | Pre-seeded verified collector account with sample grail orders & reviews |
| **Collector User** | `lan@fashionshop.com` | `Demo@123` | Pre-seeded verified collector account with concierge counter-offer & active order |
| **Inner Circle Voucher** | `ENIGMA15` | *Type `ENIGMA` on storefront* | Secret initiation reward — 15% privilege (up to `2,500,000₫`) |
| **Public Vouchers** | `CULT10` / `VAULT500K` | — | 10% welcome code & `500,000₫` vault credit |

> Admin bootstrap endpoint (dev/CI): `POST /auth/seed-admin` with `{ "secret": "<ADMIN_SEED_SECRET>" }`.

---

## Quick Start

```bash
cp .env.example .env
npm ci
npm run start:dev
```

Full local Docker stack (Postgres + Redis):

```bash
docker compose up --build -d
DATABASE_URL=postgres://postgres:postgres@localhost:5432/fashion_shop npm run seed
```

- **API Base**: `http://localhost:3000`
- **Swagger OpenAPI Docs**: `http://localhost:3000/api/docs`
- **Liveness / Readiness**: `GET /health`, `GET /ready`

---

## Core Modules & Capabilities

1. **Catalog & SKU Variants (`/products`, `/categories`, `/products/:id/reviews`)**
   - Brand, release ethos (`grail`, `reborn`, `archive`, `drop`), condition, authenticity code, EU/US size & colorway SKU stock, Redis list cache.
2. **Live Grail Auctions (`/auctions` + Socket.IO `/auctions`)**
   - Atomic `pessimistic_write` bid validation (`amount >= currentBid + minIncrement`).
   - **Anti-Snipe Protocol**: any valid bid placed with `< 60s` remaining automatically extends `endsAt` by `+120s` and broadcasts `auction:bid_placed` + `auction:extended`.
3. **Mystery Boxes & 8-Step Taste Codex (`/mystery-boxes`)**
   - `GET /mystery-boxes/quiz-questions` & `POST /mystery-boxes/decode-style` compute and persist the user's **Taste Codex** archetype (*Shadow Archive*, *Concrete Vanguard*, *Neo-Renaissance*, *Monolith Minimalist*) and match *Initiate Box*, *Inner Circle Chest*, or *Grail Vault*.
4. **"Find It At My Price" Concierge (`/concierge`)**
   - Submit target-price sourcing tickets + Admin review, counter-offer, acceptance, and vault sourcing workflow.
5. **Vouchers & Initiation Privileges (`/vouchers`)**
   - `POST /vouchers/validate` validates public and secret initiation codes (`ENIGMA15`) integrated directly into `POST /orders` server-side price verification.
6. **Executive Analytics (`/dashboard/stats`, `/dashboard/executive`, `/dashboard/revenue`)**
   - 14-day GMV series, AOV, conversion funnel, category/size/color velocity, live auction heat, low-stock SKU alerts, concierge queue, and Taste Codex distribution.
7. **AI Stylist — Hybrid BM25 RAG + Tool-Use + Zero-Key Fallback (`POST /ai-chat/message` & Socket.IO `/ai-chat`)**
   - Uses Gemini Function Calling when `GEMINI_API_KEY` is configured.
   - Automatically runs a **Smart Local Hybrid BM25 + Vietnamese/English Intent & Tool Router** (`search_products_hybrid`, `check_variant_stock`, `get_live_auctions`, `get_order_status`, `validate_coupon`) when `GEMINI_API_KEY` is absent — returning rich **Generative UI blocks** (`product_cards`, `comparison_table`, `auction_card`, `order_stepper`, `taste_codex_prompt`).

---

## Scripts

```bash
npm run lint        # ESLint + Prettier check/fix
npm test            # Jest unit & service specs
npm run test:e2e    # Supertest E2E suite (requires Postgres)
npm run build       # NestJS production build
npm run seed        # Idempotent ENIGMA vault seed
```
