---------------------------------------------------------------------
-- better-auth tables (managed by better-auth, PostgreSQL adapter) --
---------------------------------------------------------------------
CREATE TABLE "user" (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT FALSE,
    image TEXT,
    "isAnonymous" BOOLEAN DEFAULT FALSE,
    role TEXT DEFAULT 'user',
    "isPremium" BOOLEAN DEFAULT FALSE,
    "premiumUntil" TIMESTAMP,
    "authProvider" TEXT,
    "deletedAt" TIMESTAMP,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "session" (
    id TEXT PRIMARY KEY NOT NULL,
    "expiresAt" TIMESTAMP NOT NULL,
    token TEXT NOT NULL UNIQUE,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
);

CREATE TABLE "account" (
    id TEXT PRIMARY KEY NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP,
    "refreshTokenExpiresAt" TIMESTAMP,
    scope TEXT,
    password TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "verification" (
    id TEXT PRIMARY KEY NOT NULL,
    identifier TEXT NOT NULL,
    value TEXT NOT NULL,
    "expiresAt" TIMESTAMP NOT NULL,
    "createdAt" TIMESTAMP,
    "updatedAt" TIMESTAMP
);

------------------------
-- Application tables --
------------------------
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    better_auth_user_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE,
    name VARCHAR(20) NOT NULL DEFAULT '',
    auth_provider VARCHAR(20) CHECK (auth_provider IN ('email', 'google', 'guest')),
    is_premium BOOLEAN DEFAULT FALSE,
    is_anonymous BOOLEAN DEFAULT FALSE,
    premium_until TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE TABLE supermarkets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    is_custom BOOLEAN DEFAULT FALSE,
    image_url VARCHAR(500),
    user_id UUID REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supermarket_id UUID NOT NULL REFERENCES supermarkets(id),
    user_id UUID NOT NULL REFERENCES users(id),
    name VARCHAR(100) NOT NULL,
    barcode VARCHAR(50),
    is_weight_based BOOLEAN DEFAULT FALSE,
    price_usd BIGINT NOT NULL, -- stored in cents
    price_bolivares BIGINT NOT NULL, -- stored in cents
    price_bcv BIGINT NOT NULL, -- stored in cents
    image_url VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE TABLE carts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supermarket_id UUID NOT NULL REFERENCES supermarkets(id),
    user_id UUID NOT NULL REFERENCES users(id),
    local_id TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    has_budget BOOLEAN NOT NULL DEFAULT TRUE,
    budget_bs BIGINT, -- stored in cents; NULL when the cart has no budget
    budget_usd BIGINT, -- stored in cents; NULL when the cart has no budget
    total_estimated_bs BIGINT, -- stored in cents
    total_estimated_usd BIGINT, -- stored in cents
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE TABLE cart_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id UUID NOT NULL REFERENCES carts(id),
    product_id UUID NOT NULL REFERENCES products(id),
    local_id TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    is_manual_entry BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_carts_user_local_id ON carts(user_id, local_id);
CREATE INDEX idx_cart_products_cart_local_id ON cart_products(cart_id, local_id);

CREATE TABLE payment_statuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(30) NOT NULL,
    description VARCHAR(100)
);

CREATE TABLE rejection_reasons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reason VARCHAR(100) NOT NULL
);

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    number_of_months INTEGER NOT NULL,
    reference_number VARCHAR(50) NOT NULL,
    bank_name VARCHAR(80) NOT NULL,
    amount_bs BIGINT NOT NULL,
    amount_usd BIGINT NOT NULL,
    price_bcv BIGINT NOT NULL,
    identification VARCHAR(20) NOT NULL,
    is_discount BOOLEAN NOT NULL DEFAULT FALSE,
    paid_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status_id UUID NOT NULL REFERENCES payment_statuses(id),
    rejection_reason_id UUID REFERENCES rejection_reasons(id),
    rejection_message VARCHAR(200),
    approved_at TIMESTAMP,
    rejected_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_supermarkets_user ON supermarkets(user_id);
CREATE INDEX idx_carts_user_active ON carts(user_id, is_active);
CREATE INDEX idx_carts_user_created ON carts(user_id, created_at DESC);
CREATE INDEX idx_cart_products_product ON cart_products(product_id);
CREATE INDEX idx_cart_products_cart ON cart_products(cart_id);
CREATE INDEX idx_products_supermarket_user ON products(supermarket_id, user_id);
CREATE INDEX idx_payments_user_status ON payments(user_id, status_id);

-- BCV rates table
CREATE TABLE bcv_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usd_rate BIGINT NOT NULL,
    eur_rate BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- better-auth indexes
CREATE INDEX idx_session_user_id ON "session"("userId");
CREATE INDEX idx_session_token ON "session"(token);
CREATE INDEX idx_account_user_id ON "account"("userId");
CREATE INDEX idx_account_provider ON "account"("providerId", "accountId");
CREATE INDEX idx_verification_identifier ON "verification"(identifier);

-- Seed supermarkets (only if table is empty)
INSERT INTO supermarkets (id, name, is_custom, image_url, user_id, created_at, updated_at)
SELECT id, name, is_custom, image_url, user_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (VALUES
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid, 'Central Madeirense', FALSE, NULL, NULL::uuid),
    ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid, 'Excelsior Gama', FALSE, NULL, NULL::uuid),
    ('cccccccc-cccc-4ccc-8ccc-cccccccccccc'::uuid, 'Unicasa', FALSE, NULL, NULL::uuid),
    ('dddddddd-dddd-4ddd-8ddd-dddddddddddd'::uuid, 'Farmatodo', FALSE, NULL, NULL::uuid),
    ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'::uuid, 'Páramo', FALSE, NULL, NULL::uuid),
    ('ffffffff-ffff-4fff-8fff-ffffffffffff'::uuid, 'Forum', FALSE, NULL, NULL::uuid),
    ('00000000-0000-4000-8000-000000000000'::uuid, 'Río Vida', FALSE, NULL, NULL::uuid),
    ('11111111-1111-4111-8111-111111111111'::uuid, 'Plan Suárez', FALSE, NULL, NULL::uuid),
    ('22222222-2222-4222-8222-222222222222'::uuid, 'Plaza''s', FALSE, NULL, NULL::uuid),
    ('33333333-3333-4333-8333-333333333333'::uuid, 'Makro', FALSE, NULL, NULL::uuid),
    ('44444444-4444-4444-8444-444444444444'::uuid, 'HíperLíder', FALSE, NULL, NULL::uuid)
) AS data(id, name, is_custom, image_url, user_id)
WHERE NOT EXISTS (
    SELECT 1 FROM supermarkets s WHERE s.id = data.id
);

-- Seed payment statuses
INSERT INTO payment_statuses (id, name, description)
VALUES
    ('a1111111-1111-4a11-9a11-111111111111'::uuid, 'Pendiente', 'Pago pendiente, esperando verificación'),
    ('a2222222-2222-4a22-9a22-222222222222'::uuid, 'Aprobado', 'Pago verificado y aprobado'),
    ('a3333333-3333-4a33-9a33-333333333333'::uuid, 'Rechazado', 'Pago rechazado por el administrador')
ON CONFLICT (id) DO NOTHING;

-- Seed rejection reasons
INSERT INTO rejection_reasons (id, reason)
VALUES
    ('b1111111-1111-4b11-9b11-111111111111'::uuid, 'Monto insuficiente'),
    ('b2222222-2222-4b22-9b22-222222222222'::uuid, 'Número de referencia inválido'),
    ('b3333333-3333-4b33-9b33-333333333333'::uuid, 'Pago fuera del período permitido'),
    ('b4444444-4444-4b44-9b44-444444444444'::uuid, 'Pago duplicado'),
    ('b5555555-5555-4b55-9b55-555555555555'::uuid, 'Otro')
ON CONFLICT (id) DO NOTHING;
