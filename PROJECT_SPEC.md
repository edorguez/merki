# Technical Specification – Merki
**Version:** 2.0 – Production
**Date:** June 2026

---

## 1. Overview

A mobile application (iOS/Android) and web admin dashboard that allows users in Venezuela to create supermarket shopping carts with dual‑currency pricing (Bolívares + USD built-in, EUR via BCV official rate), manage budgets, and track spending. The project is a monorepo containing a Go backend (using **Gin** and **GORM**), a React Native (Expo) mobile frontend, a standalone auth server (Hono + better-auth), and a web admin dashboard (React + Vite).

---

## 2. Technology Stack

| Layer                  | Technology                                                                 |
|------------------------|----------------------------------------------------------------------------|
| **Backend**            | Go 1.25, PostgreSQL 15, Redis 7, **Gin** (HTTP), **GORM** (ORM)           |
| **Backend APIs**       | REST (OpenAPI 3.0 specification)                                           |
| **Mobile**             | React Native (Expo SDK 55) with TypeScript, Expo Router                    |
| **Web / Admin**        | React 19, Vite 5, TypeScript 6, MUI 9, GSAP 3, SCSS Modules. Fonts: **Fraunces Bold** (display headings) · **Inter** (UI text) · **Poppins Bold** (logo) |
| **Styling (Mobile)**   | Shared design-token modules (`styles/theme.ts`, `buttons.ts`, `cards.ts`, `inputs.ts`) + Unistyles for selected screens |
| **State Management**   | Zustand (cart only, persisted via AsyncStorage); custom React hooks (auth, BCV) |
| **Local Storage**      | `expo-sqlite` (offline DB), AsyncStorage (Zustand persist + caching), `expo-secure-store` (auth tokens) |
| **Offline DB**         | Local SQLite (`expo-sqlite`) mirroring backend tables with sync queue      |
| **OCR**                | `@infinitered/react-native-mlkit-text-recognition` (on‑device)             |
| **Auth**               | better-auth with Hono (standalone auth server + shared PostgreSQL)         |
| **Email**              | Resend (transactional emails with HTML templates)                          |
| **BCV Rate Scraper**   | gocolly/colly v2 with retry logic (10 min interval, 6 h cap)              |
| **Image Storage**      | AWS S3 / MinIO (local dev)                                                 |
| **Infrastructure**     | Docker containers                                                          |

**Key Go dependencies:** `gin-gonic/gin`, `gorm.io/gorm`, `gorm.io/driver/postgres`, `go-redis/redis/v8`, `gocolly/colly/v2`, `resend/resend-go/v3`, `spf13/viper`, `joho/godotenv`, `google/uuid`, `go.uber.org/zap`, `go-playground/validator/v10`, `golang.org/x/time/rate`.

---

## 3. Monorepo Folder Structure

```
merki/
├── cmd/server/              # Go backend entry point
│   └── main.go
├── configs/server/          # Viper‑based config (env vars + .env)
│   └── config.go
├── internal/
│   ├── cron/                # Background jobs
│   │   └── bcv_rate_cron.go # BCV exchange rate scraper
│   └── server/
│       ├── dto/             # Request/response DTOs + validator (Spanish errors)
│       │   └── validator.go # go-playground/validator wrapper
│       ├── email/           # Resend email service + templates
│       │   ├── email.go     # SendWelcome, SendPaymentApproved, SendPaymentRejected
│       │   └── templates/   # approved.gohtml, rejected.gohtml, welcome.gohtml
│       ├── handlers/        # Gin HTTP handlers (auth, cart, payment, sync, etc.)
│       ├── middleware/      # Auth middleware (better-auth session validation)
│       ├── models/          # GORM models (user, cart, product, payment, etc.)
│       ├── repository/      # Data access layer (GORM queries)
│       ├── services/        # Business logic layer
│       └── routes.go        # Central route registration (25+ endpoints)
├── pkg/
│   ├── constants/           # Shared constants (header keys, app info)
│   │   └── constants.go
│   ├── core/errors/         # Custom error types (ErrNotFound, ErrConflict, etc.)
│   ├── database/
│   │   ├── migrations/      # SQL migration files (golang-migrate)
│   │   ├── postgresql/      # GORM connection setup
│   │   └── redis/           # Redis client setup
│   ├── logger/              # Zap logger wrapper
│   ├── middleware/          # Reusable logging + rate limiter middleware
│   │   ├── logging.go       # Request logging middleware (Zap)
│   │   └── ratelimit.go     # Per-IP rate limiter (100 req/s, burst 200)
│   ├── models/              # BaseModel (UUID, timestamps, soft-delete)
│   └── utils/               # HTTP helpers, UUID utilities
├── auth-server/             # Standalone auth service (Hono + better-auth)
│   ├── src/
│   │   ├── auth-config.ts   # better-auth config (email, Google OAuth, anonymous)
│   │   └── server.ts        # Hono server + custom routes
│   ├── scripts/
│   │   └── set-role.ts      # CLI tool to promote user role (user/staff/admin)
│   └── Dockerfile
├── web/                     # Web admin dashboard + landing page (React 19 + Vite 5)
│   ├── src/
│   │   ├── components/
│   │   │   ├── home/        # Landing page (Hero, Features, Story, Social Proof, etc.)
│   │   │   ├── auth/        # Admin login
│   │   │   └── admin/       # Protected dashboard (payments table, modals)
│   │   ├── hooks/           # AuthContext, usePayments, useScrollProgress
│   │   ├── services/        # PaymentService, API client
│   │   ├── constants/       # Copy text, payment status UUIDs
│   │   ├── styles/          # MUI theme customization
│   │   ├── types/           # TypeScript interfaces
│   │   └── utils/           # Currency formatting
│   ├── public/
│   └── vite.config.ts
├── mobile/                  # Expo / React Native app
│   ├── app/                 # Expo Router file‑based routing
│   │   ├── (tabs)/          # Home, history, profile
│   │   ├── (cart)/          # Cart detail, scan, checkout
│   │   ├── (onboarding)/    # Welcome, login, register
│   │   └── (premium)/       # Plans, pago-móvil
│   ├── lib/                 # Core libraries
│   │   ├── auth-client.ts   # Better Auth Expo client + anonymous plugin
│   │   ├── env.ts           # Environment/device host resolution
│   │   ├── ocr.ts           # ML Kit OCR with image preprocessing + fallback
│   │   └── local/           # Offline SQLite database layer
│   │       ├── database.ts  # SQLite init, migrations, helpers
│   │       ├── syncQueue.ts # Offline sync queue management
│   │       └── repositories/
│   │           ├── cartRepository.ts        # Local cart CRUD
│   │           ├── cartProductRepository.ts # Local cart product CRUD
│   │           └── supermarketRepository.ts # Local supermarket cache
│   ├── hooks/               # React hooks
│   │   └── useNetwork.ts    # Network state detection hook
│   ├── components/          # UI components by domain (36 total)
│   │   ├── home/            # BCVRateCard, SupermarketCarousel, CartCard, etc.
│   │   ├── cart/            # BudgetSummary, ProductCard, ProductForm, etc.
│   │   ├── shared/          # Toast, BottomSheet, ActionSheet, ManualEntryModal, etc.
│   │   ├── profile/         # PremiumCard, GuestCard, SettingItem, etc.
│   │   └── history/         # HistoryCard, AmountCard, StatusBadge, etc.
│   ├── store/               # State management
│   │   ├── cartStore.ts     # Zustand store with AsyncStorage persist (carts + products)
│   │   ├── authStore.ts     # Custom React hook with offline guest support via SecureStore
│   │   └── bcvStore.ts      # Custom React hook with AsyncStorage cache (offline-first)
│   ├── services/            # HTTP client + per‑feature services
│   │   ├── api.ts           # fetch-based client with auth headers
│   │   ├── bcvService.ts
│   │   ├── cartService.ts   # Offline-first CRUD + sync enqueue
│   │   ├── historyService.ts # Offline-capable with local DB fallback
│   │   ├── paymentService.ts
│   │   ├── supermarketService.ts # Offline-capable with local cache
│   │   ├── syncService.ts   # Sync engine orchestrator (push/pull)
│   │   └── migrationService.ts # Guest→registered data migration
│   ├── styles/              # Unistyles theme + per‑screen styles
│   ├── types/               # TypeScript interfaces (domain models, API responses)
│   │   └── sync.ts          # Mobile-side sync DTOs (SyncOperation, SyncResponse)
│   └── utils/               # Currency, validation, formatting, storage, icons, tips
├── Caddyfile                # Reverse proxy config (Caddy, auto TLS)
├── caddy/
│   └── Dockerfile           # Custom Caddy image with Cloudflare DNS module
├── docker-compose.yml       # Local dev: server, postgres, redis, minio, auth-server
├── docker-compose.prod.yml  # Production: caddy, server, postgres, redis, auth-server, web
├── .env.example             # Template for local dev environment
├── .env.docker              # Docker Compose dev environment
├── .env.production.example  # Template for production environment
├── docs/
│   └── openapi.yaml         # OpenAPI 3.0 specification (OUTDATED — only 4/25+ paths)
├── scripts/
│   └── init-db.sql          # DB init + seed data
├── Dockerfile               # Multi‑stage Alpine build (Go backend)
├── Makefile                 # build, test, run, migrate, docker‑up, etc.
├── web/
│   └── Dockerfile           # Multi‑stage build (Vite → Caddy file-server)
```

---

## 4. Backend Architecture

### 4.1 Layers

The backend follows a **conventional layered architecture**:

- **Handlers** (`internal/server/handlers/`): Gin HTTP handlers that parse requests, validate input (via `dto/validator.go` — `go-playground/validator` with Spanish error messages), call the appropriate service, and return JSON responses. Each handler focuses on a specific resource.
- **Services** (`internal/server/services/`): Core business logic. Orchestrates data operations, enforces rules (premium limits, budget validation, BCV rate syncing), and calls repositories. HTTP‑agnostic and unit‑testable.
- **Repository** (`internal/server/repository/`): Data access layer using GORM. Each repository implements CRUD and custom queries for one model. The only layer that directly interacts with the database.
- **Models** (`internal/server/models/`): GORM structs representing database tables, embedding `pkg/models.BaseModel` (UUID PK, timestamps, soft‑delete).
- **DTO** (`internal/server/dto/`): Request/response structs with JSON tags, separate from models.
- **Middleware** (`internal/server/middleware/` + `pkg/middleware/`): Auth middleware that validates the Bearer token against better-auth's session validation endpoint, auto‑creates/updates the local user record. Global middleware stack includes request logging (`pkg/middleware/logging.go`) and per‑IP rate limiting (`pkg/middleware/ratelimit.go` — 100 req/s, burst 200).
- **Cron** (`internal/cron/`): Background goroutines (currently: BCV rate scraper).

### 4.2 Data Flow

1. **HTTP Request** → Gin Router → Middleware (auth) → Handler
2. **Handler** validates request + DTO, calls Service method
3. **Service** implements business logic, calls Repository methods
4. **Repository** executes GORM queries against PostgreSQL
5. **Response** flows back through the layers as JSON

### 4.3 Dependency Injection

Dependencies are passed via constructor injection:

```go
func NewCartService(cartRepo repository.CartRepository, productRepo repository.ProductRepository) *CartService {
    return &CartService{cartRepo: cartRepo, productRepo: productRepo}
}
```

### 4.4 BCV Rate Scraper

- Runs automatically on server start, then schedules daily at 04:00 AM local time.
- Uses **gocolly/colly** to scrape `bcv.org.ve` for USD and EUR official rates.
- Stores rates in the `bcv_rates` table as `BIGINT` (value × 100, stored in cents).
- **Retry logic**: If scraping fails, retries every 10 minutes, up to 36 attempts (6 hours). After exhausting retries, gives up until the next 04:00 cycle.
- The `GetLatestRate` endpoint always returns the most recent stored rate, acting as a fallback when today's scrape fails.

---

## 5. Mobile Architecture

- **Routing**: Expo Router file‑based routing with tab navigation and modal stacks.
- **State Management**: Zustand for cart data (`store/cartStore.ts`) with `zustand/middleware` persist layer backed by AsyncStorage — survives app restarts. Custom React hooks for auth (`store/authStore.ts` with SecureStore offline guest support) and BCV rate (`store/bcvStore.ts` with AsyncStorage cache, offline-first).
- **HTTP Client**: Custom `fetch`‑based API client (`mobile/services/api.ts`). Sends the better-auth session token as `Authorization: Bearer` + `X-User-ID` header. Backend URL is resolved via `lib/env.ts` (auto-detects device host in dev mode).
- **Caching**: AsyncStorage for BCV rate (reduces API calls), Zustand cart store persistence, and auth session data (via expo-secure-store).
- **Auth Client**: `lib/auth-client.ts` — better-auth Expo plugin with SecureStore storage + anonymous guest plugin. Sign-in/sign-up (email, Google, anonymous) **always requires internet** — there is no offline-guest fallback. The session is cached in SecureStore (`better-auth_session_data`) so the app remains fully usable offline afterward, until the session expires.
- **OCR**: `@infinitered/react-native-mlkit-text-recognition` for on‑device price extraction from receipt photos. Image preprocessing via `expo-image-manipulator` (crop + resize to 1200px). Falls back to mock data if ML Kit unavailable. Works fully offline.
- **Manual Entry**: `ManualEntryModal` for adding products without a receipt (barcode, prices, quantity). Works fully offline.
- **Styling**: Shared design-token system — `styles/theme.ts` (colors, spacing, typography, border radii, shadows) plus shared factories (`styles/buttons.ts`, `styles/cards.ts`, `styles/inputs.ts`) and shared components (`Button`, `Input`). Unistyles is used only by `styles/profileStyles.ts`. Light theme only (no dark mode / `useColorScheme()`). Primary brand color is `#339933`; secondary accent is `#F4A261` (warm sand) used sparingly for secondary actions, selected/active states, and link accents. **Typography:** display headlines use **Fraunces Bold**, UI text uses **Inter**, and the logo wordmark uses **Poppins Bold**. See `DESIGN.md` → *Color Usage Audit* for the live list of tokens in use vs unused in the mobile app. All pill CTAs centralize in `components/Button.tsx` (variants `primary`/`secondary`/`outline`/`neutral`/`ghost`, sizes `sm`/`md`/`lg`, optional leading/trailing icons, `isLoading`, `disabled`, `fullWidth`, `style`), and text-field labels share a single 12px uppercase token across the shared `Input`, `PickerField`, and per-form label styles.
- **Local DB**: `expo-sqlite` with a local schema mirroring backend tables (`carts`, `cart_products`, `supermarkets`) plus a `sync_queue` table for tracking pending changes. Three local repositories (`cartRepository`, `cartProductRepository`, `supermarketRepository`) provide offline CRUD operations.
- **Sync Engine**: `services/syncService.ts` orchestrates offline→online synchronization. On connectivity restored, the sync queue is drained by calling `POST /api/v1/sync` with batched `SyncOperation` items. Conflict resolution uses **last-write-wins** based on timestamps.
- **Network Detection**: `hooks/useNetwork.ts` wraps `expo-network` to detect connectivity state changes; auto-triggers sync on reconnection.
- **Data Flow**:
  1. All mutations (create/update/delete) write to local SQLite + Zustand first (optimistic).
  2. After local write, a `SyncOperation` is enqueued in the `sync_queue` table.
  3. If online, `syncService.syncAll()` is called immediately to push changes to the server.
  4. If offline, the operation stays queued and is processed when connectivity returns.
  5. On successful sync, the server returns the real UUID which replaces the temporary `local_` prefix.

---

## 6. API & OpenAPI Specification

The OpenAPI 3.0 spec (`docs/openapi.yaml`) is the **source of truth** for the API contract.

- **Go server stubs** were previously generated via `oapi-codegen` → `internal/api/rest/generated.go`, but that directory no longer exists — all handlers are hand‑written.
- **TypeScript client generation** is deprecated; mobile uses hand‑written service functions in `mobile/services/`.
- **Note:** The actual OpenAPI spec at `docs/openapi.yaml` is **severely outdated** — it documents only 4 paths while the backend has 25+ routes. It should be regenerated.

### 6.1 Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | — | Health check |
| POST | `/api/v1/auth/sync` | Bearer + X-User-ID | Sync/upsert user from better-auth |
| GET | `/api/v1/auth/me` | Bearer + X-User-ID | Get current user |
| POST | `/api/v1/carts` | Bearer + X-User-ID | Create cart |
| GET | `/api/v1/carts` | Bearer + X-User-ID | List user carts |
| GET | `/api/v1/carts/:cartId` | Bearer + X-User-ID | Get cart detail with products |
| POST | `/api/v1/carts/:cartId/checkout` | Bearer + X-User-ID | Checkout cart |
| POST | `/api/v1/cart-products` | Bearer + X-User-ID | Add product to cart |
| PUT | `/api/v1/cart-products/:cartProductId` | Bearer + X-User-ID | Update cart product |
| PUT | `/api/v1/cart-products/:cartProductId/quantity` | Bearer + X-User-ID | Update product quantity |
| DELETE | `/api/v1/cart-products/:cartProductId` | Bearer + X-User-ID | Remove product from cart |
| POST | `/api/v1/sync` | Bearer + X-User-ID | Process sync batch |
| POST | `/api/v1/payments` | Bearer + X-User-ID | Create payment request |
| GET | `/api/v1/payments` | Bearer + X-User-ID | List payments |
| GET | `/api/v1/payments/:paymentId` | Bearer + X-User-ID | Get payment detail |
| PUT | `/api/v1/payments/:paymentId` | Bearer + X-User-ID | Update payment |
| DELETE | `/api/v1/payments/:paymentId` | Bearer + X-User-ID | Delete payment |
| GET | `/api/v1/payments/by-user/:userId` | Bearer + X-User-ID | Get payments by user (admin) |
| GET | `/api/v1/payments/by-email/:email` | Bearer + X-User-ID | Get payments by email (admin) |
| GET | `/api/v1/supermarkets` | Bearer + X-User-ID | List supermarkets |
| POST | `/api/v1/supermarkets` | Bearer + X-User-ID | Create custom supermarket |
| GET | `/api/v1/supermarkets/:supermarketId` | Bearer + X-User-ID | Get supermarket |
| GET | `/api/v1/bcv-rates` | Bearer + X-User-ID | Get latest BCV rate |
| GET | `/api/v1/rejection-reasons` | Bearer + X-User-ID | List rejection reasons |
| GET | `/api/v1/payment-statuses` | Bearer + X-User-ID | List payment statuses |
| POST | `/api/v1/auth/internal/migrate-user-data` | Bearer + X-User-ID | Migrate data from anonymous to registered user |

---

## 7. Data Models (PostgreSQL with GORM)

### 7.1 better-auth Tables (managed by better-auth)

```sql
CREATE TABLE "user" (
    id          TEXT PRIMARY KEY NOT NULL,
    name        TEXT NOT NULL,
    email       TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT FALSE,
    image       TEXT,
    "isAnonymous" BOOLEAN DEFAULT FALSE,
    role        TEXT DEFAULT 'user',
    "isPremium" BOOLEAN DEFAULT FALSE,
    "premiumUntil" TIMESTAMP,
    "authProvider" TEXT,          -- 'email' | 'google' | 'anonymous'
    "deletedAt" TIMESTAMP,        -- soft-delete
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Fields `role`, `isPremium`, `premiumUntil`, `authProvider`, `deletedAt`
-- are custom additionalFields configured via better-auth in auth-config.ts.

CREATE TABLE "session" (
    id          TEXT PRIMARY KEY NOT NULL,
    "expiresAt" TIMESTAMP NOT NULL,
    token       TEXT NOT NULL UNIQUE,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId"    TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
);

CREATE TABLE "account" (
    id          TEXT PRIMARY KEY NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId"    TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken"   TEXT,
    "accessTokenExpiresAt" TIMESTAMP,
    "refreshTokenExpiresAt" TIMESTAMP,
    scope       TEXT,
    password    TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "verification" (
    id          TEXT PRIMARY KEY NOT NULL,
    identifier  TEXT NOT NULL,
    value       TEXT NOT NULL,
    "expiresAt" TIMESTAMP NOT NULL,
    "createdAt" TIMESTAMP,
    "updatedAt" TIMESTAMP
);
```

### 7.2 Application Tables (managed by Go backend with GORM)

All application models embed `BaseModel` (UUID PK, `created_at`, `updated_at`, `deleted_at`). Monetary values are stored as `BIGINT` in cents to avoid floating‑point rounding errors.

```sql
-- Application users (links to better-auth user via better_auth_user_id)
CREATE TABLE users (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    better_auth_user_id VARCHAR(255) UNIQUE NOT NULL,
    email              VARCHAR(100) UNIQUE,
    name               VARCHAR(20) NOT NULL DEFAULT '',  -- display name, capped at 20 chars
    auth_provider      VARCHAR(20) CHECK (auth_provider IN ('email','google','guest')),
    is_premium         BOOLEAN DEFAULT FALSE,
    is_anonymous       BOOLEAN DEFAULT FALSE,
    premium_until      TIMESTAMP,
    created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at         TIMESTAMP
);

-- Supermarkets
CREATE TABLE supermarkets (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) NOT NULL,
    is_custom   BOOLEAN DEFAULT FALSE,
    image_url   VARCHAR(500),
    user_id     UUID REFERENCES users(id),
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at  TIMESTAMP
);

-- Products
CREATE TABLE products (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supermarket_id  UUID NOT NULL REFERENCES supermarkets(id),
    user_id         UUID NOT NULL REFERENCES users(id),
    name            VARCHAR(100) NOT NULL,
    barcode         VARCHAR(50),
    is_weight_based BOOLEAN DEFAULT FALSE,
    price_usd       BIGINT NOT NULL,
    price_bolivares BIGINT NOT NULL,
    price_bcv       BIGINT NOT NULL,
    image_url       VARCHAR(500),
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at      TIMESTAMP
);

-- Carts
CREATE TABLE carts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supermarket_id      UUID NOT NULL REFERENCES supermarkets(id),
    user_id             UUID NOT NULL REFERENCES users(id),
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    budget_bs           BIGINT NOT NULL DEFAULT 0,
    budget_usd          BIGINT NOT NULL DEFAULT 0,
    total_estimated_bs  BIGINT,
    total_estimated_usd BIGINT,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at          TIMESTAMP
);

-- Cart products (line items)
CREATE TABLE cart_products (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id         UUID NOT NULL REFERENCES carts(id),
    product_id      UUID NOT NULL REFERENCES products(id),
    quantity        INTEGER NOT NULL DEFAULT 1,
    is_manual_entry BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at      TIMESTAMP
);

-- Payment statuses (lookup table)
CREATE TABLE payment_statuses (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(30) NOT NULL,
    description VARCHAR(100)
);

-- Rejection reasons (lookup table)
CREATE TABLE rejection_reasons (
    id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reason  VARCHAR(100) NOT NULL
);

-- Payments (premium subscription requests via pago-móvil)
CREATE TABLE payments (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id),
    number_of_months    INTEGER NOT NULL,
    reference_number    VARCHAR(50) NOT NULL,
    bank_name           VARCHAR(80) NOT NULL,
    amount_bs           BIGINT NOT NULL,
    amount_usd          BIGINT NOT NULL,
    price_bcv           BIGINT NOT NULL,
    identification      VARCHAR(20) NOT NULL,
    is_discount         BOOLEAN NOT NULL DEFAULT FALSE,
    paid_at             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status_id           UUID NOT NULL REFERENCES payment_statuses(id),
    rejection_reason_id UUID REFERENCES rejection_reasons(id),
    rejection_message   VARCHAR(200),
    approved_at         TIMESTAMP,
    rejected_at         TIMESTAMP,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at          TIMESTAMP
);

-- BCV exchange rates (auto‑scraped)
CREATE TABLE bcv_rates (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usd_rate    BIGINT NOT NULL,
    eur_rate    BIGINT NOT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at  TIMESTAMP
);
```

### 7.3 Indexes

```sql
CREATE INDEX idx_supermarkets_user ON supermarkets(user_id);
CREATE INDEX idx_carts_user_active ON carts(user_id, is_active);
CREATE INDEX idx_cart_products_product ON cart_products(product_id);
CREATE INDEX idx_cart_products_cart ON cart_products(cart_id);
CREATE INDEX idx_session_user_id ON "session"("userId");
CREATE INDEX idx_session_token ON "session"(token);
CREATE INDEX idx_account_user_id ON "account"("userId");
CREATE INDEX idx_account_provider ON "account"("providerId", "accountId");
CREATE INDEX idx_verification_identifier ON "verification"(identifier);
```

### 7.4 Payment Status UUIDs

Payment statuses use fixed UUIDs referenced in the Go backend code:

```go
PendingStatusID  = "a1111111-1111-4a11-9a11-111111111111"
ApprovedStatusID = "a2222222-2222-4a22-9a22-222222222222"
RejectedStatusID = "a3333333-3333-4a33-9a33-333333333333"
```

### 7.5 Plans & Monetization (Free vs Premium)

- **Free plan (default):** The app displays ads to the user.
- **Premium plan:** No ads. Future premium-only features are planned but not yet available (see §13).
- **Premium benefits (source of truth — keep mobile copy in sync):**
  1. **Ad-free experience** — the only current premium benefit.
  2. **Access to future features** — planned premium-only features, not yet available.
  The in-app copy in `mobile/components/profile/PremiumCard.tsx` and `mobile/app/(premium)/plans.tsx` (both list "Sin publicidad en la app" / "Acceso a futuras funciones") must match these two items exactly.
- Premium is an **entitlement flag, not a login level** — all users (email, Google, anonymous guests) can log in and use the app identically.
- Premium status is stored in both the application `users` table (`is_premium`, `premium_until`) and the better-auth `"user"` table (`isPremium`, `premiumUntil`); both are kept in sync by the Go backend on payment approval/rejection.
- **Grant path:** An admin approves a pago-móvil payment in the web dashboard (`PUT /api/v1/payments/:paymentId` with `statusId` = approved). The Go backend sets `is_premium = true`, computes `premium_until` by extending the current (or future) expiry by `numberOfMonths` calendar months (1 / 3 / 12), writes both tables, and calls the auth-server's `/api/auth/update-premium` endpoint.
- **Revoke path:** Admin rejects a payment → `is_premium = false`, `premium_until = NULL` in both tables.
- **No feature limits are enforced in the MVP.** Free and premium users currently have identical functionality; the only difference is ad display. Carts, products, OCR scans, saved products, and price reports are all unlimited for everyone — **do not** advertise these as premium benefits.

### 7.6 Seed Data

The migration seeds 11 Venezuelan supermarkets (Central Madeirense, Excelsior Gama, Unicasa, Farmatodo, Paramo, Forum, Rio Vida, Plan Suarez, Plaza's, Makro, HiperLider), 3 payment statuses (Pendiente, Aprobado, Rechazado), and 5 rejection reasons.

---

## 8. Authentication & Authorization

### 8.1 Architecture

Authentication is handled by a **standalone auth server** (`auth-server/`) using **better-auth** with **Hono**. The Go backend does not handle credential validation — it delegates to the auth server.

**Flow:**
1. **Mobile App** sends auth requests (sign-in, sign-up, Google OAuth) to the auth server.
2. **Auth Server** uses better-auth to manage credentials, sessions, and OAuth in shared PostgreSQL tables (`user`, `session`, `account`). It also exposes a custom OAuth proxy for iOS (`/api/auth/expo-authorization-proxy`) that returns an HTML page with cookies instead of a 302 redirect (workaround for `ASWebAuthenticationSession` limitations).
3. **Auth Server** exposes a `POST /api/auth/validate-session` endpoint that validates a Bearer token using a **two-path approach**:
   - **Fast path (direct SQL):** Looks up the session token in the `session` table with `expiresAt > NOW()`.
   - **Fallback (better-auth handler):** If no direct match, sends a synthetic request to better-auth's `get-session` endpoint with the token as a cookie.
   - Returns `{ user: { id, email, name, isAnonymous } }` or `null`.
4. **Go Middleware** passes the Bearer token to the auth server's validate endpoint, retrieves the user info, and auto‑creates/updates the application user record in the `users` table.
5. **Handlers** use `GetUserIDFromContext(c)` to access the authenticated user's UUID.

### 8.2 Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/validate-session` | Validate Bearer token (direct SQL fast path + better-auth fallback) |
| POST | `/api/auth/update-premium` | Update premium status in better-auth `user` table |
| GET | `/api/auth/expo-authorization-proxy` | iOS OAuth proxy (HTML+JS redirect instead of 302) |
| ALL | `/api/auth/*` | Pass‑through to better-auth handler (register, login, OAuth, anonymous, etc.) |
| GET | `/health` | Auth server health check |

### 8.3 Authorization

- **Free vs Premium**: Premium is an entitlement flag, not a login level — all users (email, Google, anonymous guests) can log in and use the app. Premium currently means **ad-free**; no feature gating exists yet. The Go backend keeps `users.is_premium`/`premium_until` and better-auth's `"user"."isPremium"`/`premiumUntil` in sync on payment approval/rejection.
- **Guest users**: Supported via better-auth anonymous sessions (`"isAnonymous"`). Signing in as a guest **always requires internet** (no offline fallback); after sign-in the app works offline via the cached session. Anonymous users who later register with email/Google trigger a **universal local migration** (`useGuestDataMigration`) plus a server-side ownership transfer (`onLinkAccount` → `POST /api/v1/auth/internal/migrate-user-data`) so carts and products carry over.
- **Roles**: Identified by better-auth's `role` field. Supported values: `user`, `staff`, `admin`. A CLI script (`auth-server/scripts/set-role.ts`) can promote a user by email.
- **Admin/staff users**: Access the web admin dashboard at `/admin/payments` to manage premium subscription payments (approve/reject).

### 8.4 Known Issues & Security Gaps

- **`/api/auth/update-premium` is unauthenticated** (`auth-server/src/server.ts`): any caller that can reach the auth server and knows a `userId` can flip that user's premium status. It should require a shared secret or an authenticated admin call.
- **Premium self-grant via sync**: **Fixed** — `POST /api/v1/sync` no longer applies client-supplied `isPremium`/`isAnonymous` fields to the `users` table (`internal/server/services/sync_service.go`); premium and anonymous flags are managed server-side only.
- **No premium-expiry job**: nothing clears `is_premium` when `premium_until` passes in the DB. `GET /api/v1/auth/me` now returns `User.IsActivePremium()` (flag **and** expiry), so expired users correctly see ads again; the DB flag itself is only cleaned on the next write. A cron job to clear stale flags is still recommended.
- **Non-transactional approval**: payment update, Go user update, and auth-server update run as separate writes in goroutines (`internal/server/services/payment_service.go`); a failure can leave the two sources of truth inconsistent.
- **Wholesale revocation**: rejecting any payment sets `is_premium = false` even when the user has other approved payments. Rejection should recompute the entitlement from remaining approved payments.

---

## 9. Offline Strategy

The mobile app implements a **full offline-first** architecture with local SQLite storage and a sync queue for background synchronization.

### 9.1 Architecture

```
User Action → Local SQLite (immediate) → Zustand Store (optimistic UI) → Sync Queue → POST /api/v1/sync (when online)
```

### 9.2 Local SQLite Database

Location: `mobile/lib/local/database.ts`

Tables: `carts`, `cart_products`, `supermarkets`, `sync_queue`, `auth_cache`

All tables mirror the backend schema with cents-denominated monetary values. Records use either server-assigned UUIDs or temporary `local_`-prefixed UUIDs for offline-created items.

### 9.3 Sync Queue

Location: `mobile/lib/local/syncQueue.ts`

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PK | Auto-increment |
| `table_name` | TEXT | Affected table (`carts`, `cart_products`, `supermarkets`) |
| `action` | TEXT | `INSERT`, `UPDATE`, `DELETE` |
| `local_id` | TEXT | UUID of the affected row |
| `payload` | TEXT | JSON payload of the operation |
| `status` | TEXT | `pending` → `syncing` → `completed` / `failed` |
| `error` | TEXT | Error message on failure |
| `retry_count` | INTEGER | Max 5 retries before permanent failure |

### 9.4 Sync Engine

Location: `mobile/services/syncService.ts`

- On connectivity restored: fetch pending operations, batch into `SyncRequest`, POST to `/api/v1/sync`
- After successful sync: replace `local_` UUIDs with server-assigned UUIDs in both SQLite and Zustand
- Failed operations: retry with exponential backoff (up to 5 attempts)
- Reset stuck `syncing` operations to `pending` on app startup

### 9.5 Conflict Resolution

**Strategy: Last-write-wins** — timestamps from each operation are compared against the server's `updated_at`. The most recent change wins. If a conflict is detected, the server returns the `serverVersion` so the mobile can update its local state.

### 9.6 Offline Capabilities by Screen

| Screen | Offline | Notes |
|--------|---------|-------|
| **Login/Register** | Requires internet | Sign-in/sign-up (email, Google, anonymous) needs internet; cached sessions keep the app usable offline afterward |
| **Home (Create Cart)** | ✅ Full | Carts created locally, synced when online |
| **Cart Detail** | ✅ Full | Add/edit/delete products locally, quantities, checkout |
| **Scan (OCR)** | ✅ Full | ML Kit runs on-device; products added locally |
| **History** | ✅ Full | Reads from local SQLite; shows last synced timestamp |
| **Profile** | Partial | Profile data from last sync; premium/upgrade buttons require internet |
| **Premium (Plans, Pago-móvil)** | ❌ Requires internet | Network guard at layout level redirects to profile |
| **Ads (free tier)** | Online only | Free users see ads only when online; premium users see none |

### 9.7 Offline After Authentication

- Sign-in/sign-up (email, Google, anonymous) **always requires internet** — there is no offline-guest fallback.
- Once authenticated, the better-auth session is cached in SecureStore (`better-auth_session_data`); `useSession` hydrates from that cache when offline, so the app keeps working (carts, sync queue, BCV cache, history local fallback) until the session expires.
- **Universal identity migration**: `useGuestDataMigration` persists the current identity (`merki.prev.identity`) and, whenever the session transitions **anonymous → registered** (or to any different account), calls `migrationService.migrateGuestData(oldId, newId)` to re-key local carts/supermarkets and re-upload any unsynced carts **and their products** to the new account. The better-auth `onLinkAccount` hook additionally transfers already-synced server data via the backend.
- Auth sessions are cached until their better-auth `expiresAt`; after expiry, re-authentication requires internet.

### 9.8 Backend Sync Endpoint

`POST /api/v1/sync` — processes batched `SyncOperation` items for all tables:

- **supermarkets**: INSERT (custom), UPDATE, DELETE
- **products**: INSERT, UPDATE, DELETE
- **carts**: INSERT, UPDATE (including checkout), DELETE
- **cart_products**: INSERT, UPDATE (quantity), DELETE
- **users**: UPDATE, DELETE (limited to own record)

Returns `SyncResponse` with per-operation results and `serverVersion` for conflict resolution.

---

## 10. Google ML Kit Integration (OCR)

- **Library**: `@infinitered/react-native-mlkit-text-recognition`
- **Setup**: Installed as an Expo bare‑workflow dependency with native pods/Gradle config.
- **Flow**:
  1. User captures a receipt photo using `expo-camera`.
  2. Image is preprocessed via `expo-image-manipulator` (cropped + resized to 1200px) for better recognition.
  3. Text is recognized on‑device by ML Kit Text Recognition. Falls back to mock/structured data if ML Kit is unavailable.
  4. Extracted text is parsed with block-aware heuristics to identify product names and prices:
     - Name block detected by largest font size.
     - Price block detected by currency keywords (`Bs`, `USD`, `$`) and proximity to name.
     - `priceRegex`: `/(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/`
     - `currencyRegex`: `/(Bs|USD|\$)/i`
  5. The scan result populates the product form (`ProductScanResultModal`), allowing the user to confirm/edit before adding to cart.

---

## 11. Deployment & Configuration

### 11.1 Local Development (Docker Compose)

- **docker-compose.yml** (`docker compose --env-file .env.docker up`): 5 services:
  - `server` — Go backend (depends on postgres + redis)
  - `postgres` — PostgreSQL 15 with auto‑init via `scripts/init-db.sql`
  - `redis` — Redis 7
  - `minio` — S3‑compatible storage for product images (standalone)
  - `auth-server` — Hono + better-auth service (depends on postgres, shares DB)
- **Environment variables**: Loaded via Viper from `.env` / `.env.docker` files.

### 11.2 Backend Go Server

- **Dockerfile**: Multi‑stage build (Go 1.25 alpine → alpine:3.21). Runs as non‑root user (UID 1001). Includes health check on `/health`.
- **Connection pool**: PostgreSQL configured with `MaxOpenConns=25`, `MaxIdleConns=10` for production load.
- **Graceful shutdown**: Listens for `SIGINT`/`SIGTERM`, drains active connections with a 30‑second timeout before exit.
- **Rate limiting**: Per‑IP token bucket (100 req/s, burst 200) using `golang.org/x/time/rate`. Returns `429 Too Many Requests` with Spanish error message.
- **Logger**: Zap structured logger. Debug mode controlled via `APP_DEBUG` env var.

### 11.3 Mobile (Expo)

- Builds via **EAS Build** for development and production.
- Environment variables injected at build time via `app.config.js` / `.env` files. Device host auto-detected in dev mode via `lib/env.ts`.

### 11.4 Web Admin Dashboard

- Built with **Vite 5**, served via **Caddy file-server** Docker container.
- **web/Dockerfile**: Multi‑stage build (node:22-alpine builder → caddy:2-alpine runner). Vite build args (`VITE_BETTER_AUTH_URL`, `VITE_GO_BACKEND_URL`) injected at build time.

### 11.5 Production Deployment

- **docker-compose.prod.yml** (`docker compose -f docker-compose.prod.yml --env-file .env up -d`): 6 services:

  | Service | Role | Ports exposed |
  |---------|------|---------------|
  | `caddy` | Reverse proxy with auto TLS (Let's Encrypt) | 80, 443 |
  | `server` | Go backend API | Internal only |
  | `postgres` | PostgreSQL 15 | Internal only (no host port) |
  | `redis` | Redis 7 | Internal only (no host port) |
  | `auth-server` | Hono + better-auth | Internal only |
  | `web` | Admin dashboard (nginx) | Internal only |

- **Caddy reverse proxy** routes:
  - `api.{DOMAIN}` → `server:8080`
  - `auth.{DOMAIN}` → `auth-server:3001`
  - `admin.{DOMAIN}` → `web:80`
- **Caddyfile** uses `{$DOMAIN}` env var for domain substitution. Caddy automatically provisions Let's Encrypt certificates using the **Cloudflare DNS challenge** (DNS-01), configured via `CLOUDFLARE_API_TOKEN` in the environment. This avoids HTTP-01 port conflicts with Cloudflare proxy.
- **MinIO is excluded** from production — not yet used.
- **No database/Redis ports are exposed** to the host — all inter‑service communication happens over the internal Docker bridge network.
- **Environment**: `APP_ENV=production`, `APP_DEBUG=false` are hardcoded in the production compose file.
- **Production env template**: `.env.production.example` documents all required variables. Copy to VPS as `.env`, fill in secrets, and deploy.

---

## 12. Development & Production Workflow

### 12.1 Local Development

1. **Clone** the repo and run `make docker-up` (starts PostgreSQL, Redis, MinIO, auth server).
2. **Backend**: `make run` (or `air` for hot reload) — Go server on `:8080`.
3. **Auth server**: `cd auth-server && npm run dev` — Hono server on `:3001`.
4. **Web dashboard**: `cd web && npm run dev` — Vite dev server on `:5173`.
5. **Mobile**: `cd mobile && npx expo run:ios` (or Android).
6. **Database migrations**: `make migrate-up` (applies `pkg/database/migrations/001_create_tables.up.sql`).
7. **Auth roles**: `cd auth-server && npx tsx scripts/set-role.ts <email> <role>` (promote user to staff/admin).
8. **API changes**: Update handlers manually (OpenAPI spec at `docs/openapi.yaml` is outdated and should be regenerated).

### 12.2 Production Deploy

1. Provision a VPS (Ubuntu 24.04, Docker + Compose installed).
2. Clone the repo to `/opt/merki`.
3. Copy `.env.production.example` to `.env` and fill in all secrets and the `DOMAIN`.
4. Generate a **Cloudflare API Token** (Profile → API Tokens → Create Token → Edit zone DNS → zone: `{$DOMAIN}`) and paste it as `CLOUDFLARE_API_TOKEN` in `.env`.
5. Build and start all services:
   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env up -d
   ```
6. Caddy automatically provisions TLS certificates for all subdomains using the **Cloudflare DNS challenge** (DNS-01 via API token). No open HTTP ports required.
7. Monitor with `docker compose logs -f`.

---

## 13. Future Considerations

- **Crowdsourced pricing**: A `prices` table with confidence‑scoring algorithm for community‑reported product prices (as originally specified).
- **Ads (free tier)**: Free users will see ads in‑app; premium removes them. Ad provider/SDK is **AdMob** (`react-native-google-mobile-ads`) — the client gates ad rendering on the user's premium status. See `docs/ads.md` for the live integration checklist and deployment status.
- **Premium feature set**: Planned premium‑only features (beyond ad removal) are not yet defined or built.
- **Offline sync queue**: Local SQLite + background sync with exponential backoff for write‑operations without network. (Partially started — `POST /api/v1/sync` endpoint + `SyncOperation` types exist, `expo-sqlite` dependency added.)
- **Push notifications**: Via Expo Push Notifications for premium expiry reminders and cart sharing.
- **Admin dashboard**: ✅ **Implemented** — The `web/` app provides a marketing landing page and an admin panel at `/admin/payments` for approving/rejecting premium subscription payments. Future iterations may add user management, reported price review, and analytics.
- **Stripe / USDT payments**: Alternative payment methods for premium subscriptions.

---

## 14. License

MIT
