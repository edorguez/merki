# AGENTS.md — Merki

Agent guidance for this repository. Read this first, every session. It is the
routing table: it tells you the non-negotiable rules and *where* to read for
depth. Do not treat it as the full spec.

## What this is

Merki is a monorepo for a Venezuela supermarket shopping-cart app with
dual-currency pricing (Bolívares + USD, EUR via BCV rate). Four apps share one
repo:

- **Go backend** (`cmd/`, `internal/`, `pkg/`) — Gin + GORM + PostgreSQL/Redis.
- **Mobile app** (`mobile/`) — Expo / React Native, offline-first.
- **Auth server** (`auth-server/`) — Hono + better-auth (standalone).
- **Web admin + landing** (`web/`) — React 19 + Vite 5.

Full architecture, schema, endpoints, and flows: `PROJECT_SPEC.md`.

## Non-negotiable rules

These are the rules most likely to be silently violated. Follow them without
being asked.

1. **Money is `BIGINT` in cents.** Never use floats for currency. All monetary
   columns (`price_usd`, `amount_bs`, `budget_usd`, BCV rates, etc.) store the
   value × 100.
2. **Auth is delegated to the auth server.** The Go backend never validates
   credentials itself. Handlers get the current user via
   `GetUserIDFromContext(c)`. Sessions use better-auth; the token is sent as
   `Authorization: Bearer` plus an `X-User-ID` header.
3. **Premium is an entitlement flag, not a login level.** All users (email,
   Google, anonymous guest) use the app identically. The **only** current
   premium benefit is ad-free; the second advertised benefit is "access to
   future features" (not yet built). Do **not** advertise carts, OCR, saved
   products, or price reports as premium perks — there are no feature limits in
   the MVP.
4. **Never trust client-supplied `isPremium` / `isAnonymous`.** Premium and
   anonymous flags are managed server-side only (see `sync_service.go`).
5. **Offline-first on mobile.** Every mutation writes to local SQLite + the
   Zustand store (optimistic) and enqueues a `SyncOperation`; the server sync
   happens after, when online. Do not add code paths that require the network
   for core cart/product operations.
6. **Auth sign-in always requires internet** on mobile — there is no
   offline-guest fallback. The session is cached in SecureStore afterward.
7. **Styling.** Mobile uses the shared design tokens in `mobile/styles/`
   (`theme.ts`, `buttons.ts`, `cards.ts`, `inputs.ts`). Light theme only — no
   dark mode, no `useColorScheme()`. Primary brand color `#339933`; secondary
   accent `#F4A261` (sparingly). Display font Fraunces Bold, UI font Inter,
   logo Poppins Bold. Details in `DESIGN.md`.
8. **Backend layering.** Request flow is handler → service → repository. GORM
   queries live only in `internal/server/repository/`; business logic only in
   `internal/server/services/`. Keep handlers thin.
9. **Errors and DTOs.** Validate with the `dto/validator.go` wrapper; validation
   error messages are in Spanish, matching the rest of the user-facing copy.
10. **`docs/openapi.yaml` is outdated** (documents ~4 of 25+ routes). Trust the
    handlers in `internal/server/routes.go` over the spec. Do not regenerate Go
    stubs with `make generate` — that path is deprecated.

## Commands

Backend (repo root):

- `make run` — run the Go server (`:8080`) · `air` for hot reload
- `make build` · `make test` · `make test-race` · `make coverage`
- `make lint` — golangci-lint
- `make migrate-up` / `make migrate-down` — golang-migrate (reads `DATABASE_URL` from `.env`)
- `make docker-up` / `make docker-down` — dev stack with `.env.docker`
- `make docker-server-up` / `make docker-auth-up` — restart one service

Per-app:

- Mobile: `cd mobile && npm run ios` (or `android`) · `npm run lint` · `npm run type-check`
- Web: `cd web && npm run dev` (`:5173`) · `npm run build` · `npm run lint`
- Auth server: `cd auth-server && npm run dev` (`:3001`) · `npm run build`
- Promote a role: `cd auth-server && npx tsx scripts/set-role.ts <email> <role>`

## Architecture map

<!-- Added by ECC codebase-onboarding (2026-09-28). Everything above is
     unchanged; this section only adds concrete paths, flows, and conventions. -->

### Layout

| Path | Purpose |
| --- | --- |
| `cmd/server/main.go` | Go entry point: config → Postgres/Redis → repos → services → routes; starts the BCV cron. |
| `internal/server/routes.go` | Single Gin route table for all `/api/v1` endpoints. |
| `internal/server/handlers/` | Thin HTTP handlers, one per domain. |
| `internal/server/services/` | Business logic (`auth`, `cart`, `sync`, `payment`, `bcv_rate`). |
| `internal/server/repository/` | All GORM queries. |
| `internal/server/models/`, `.../dto/` | Persistence models; DTOs + `validator.go`. |
| `internal/server/middleware/` | `auth.go` (session) and `internal_auth.go` (shared secret + admin role). |
| `internal/cron/bcv_rate_cron.go` | Periodic BCV rate refresh. |
| `pkg/database/migrations/001_create_tables.{up,down}.sql` | Full schema (single golang-migrate pair). |
| `pkg/{logger,middleware,session,core/errors,constants,utils}/` | Shared Go libs. |
| `auth-server/src/{server.ts,auth-config.ts}` | Hono + better-auth; `/api/auth/*` proxy plus `validate-session`, `update-premium`, `delete-account`. |
| `mobile/app/` | Expo Router groups: `(tabs)`, `(cart)`, `(onboarding)`, `(premium)`. |
| `mobile/lib/local/` | SQLite (`database.ts`), `syncQueue.ts`, local `repositories/`. |
| `mobile/{store,services,components,styles}/` | Zustand stores; API clients; UI; design tokens. |
| `web/src/{App.tsx,main.tsx,components/admin/,lib/}` | Landing + admin SPA; API/auth clients in `lib/`. |
| `configs/server/config.go` | Env-based Go config. |

### Backend request lifecycle

`main.go` builds repos → services and calls `server.SetupRoutes`. Requests pass
Gin middleware (logging, CORS, rate limit 100/200) → `AuthMiddleware` (validates
the better-auth session and injects the user) → handler → service → repository →
PostgreSQL. Admin routes add `AdminRoleMiddleware`; `/auth/internal/*` uses
`InternalAuthMiddleware` (shared secret). Offline mobile mutations replay through
`POST /api/v1/sync` → `sync_service.go`.

### Where to look

| I want to… | Look at |
| --- | --- |
| Add/route an endpoint | `internal/server/routes.go` → `handlers/` → `services/` → `repository/` |
| Change the schema | `pkg/database/migrations/001_create_tables.up.sql` (+ `.down.sql`) → `internal/server/models/` |
| Touch auth/session | `auth-server/src/`, `internal/server/middleware/auth.go` |
| Offline sync | `mobile/lib/local/`, `mobile/services/syncService.ts`, `internal/server/services/sync_service.go` |
| Admin UI / API client | `web/src/components/admin/`, `web/src/lib/api.ts` |

### Conventions

- Go module `github.com/edorguez/merki` (Go 1.25); Gin + GORM. GORM only in `repository/`.
- Go tests sit beside sources as `*_test.go` (`make test`, `make test-race`).
- Mobile routes are Expo Router folders; styling via `mobile/styles/` tokens only.
- Commit history is short, imperative, and mixed EN/ES (`fix …`, `add …`, `crear …`); no enforced convention detected.

## Where to read for depth

Load these only when the task needs them — they are large.

- `PROJECT_SPEC.md` — full architecture, data models, API endpoints, offline
  strategy, auth flow, deployment. Canonical source of truth.
- `DESIGN.md` — design tokens, color usage audit, typography, component specs.
  Read before any UI/styling work in `mobile/` or `web/`.
- `docs/openapi.yaml` — API contract (**outdated**; prefer handlers).
- `docs/ads.md` — AdMob integration status (free tier).
- `docs/release-android.md`, `docs/release-ios.md` — release runbooks.
- `docs/opencode-ecc-workflow.md` — how to work here with OpenCode + ECC
  (Plan → Build → Verify flow, command/agent cheat sheet).

## Skills routing

Skills are lazy-loaded. Load the matching skill **before** writing code in that
area:

- Go backend (`cmd/`, `internal/`, `pkg/`) → `golang-pro`
- Web React (`web/`) → `vercel-react-best-practices`
- Mobile Expo/RN (`mobile/`) → `vercel-react-native-skills`
- Token-efficiency / terse mode → `caveman` (opt-in: "caveman mode" / `/caveman`)
