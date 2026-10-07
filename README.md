# Repair Shop Management System

A web-based management system for mobile phone and electronics repair shops. Staff manage repair jobs, customers, devices, inventory, and invoicing through an internal dashboard. Customers can track their repairs via a public-facing portal.

## Architecture

```
repair-shop/
├── apps/
│   ├── api/          ← NestJS backend (port 3001)
│   └── web/          ← Next.js frontend (port 3000)
├── packages/
│   └── shared/       ← Shared TypeScript enums and types
├── docker-compose.yml
└── docker-compose.override.yml
```

### Technology stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui |
| Backend | NestJS 10, TypeScript, class-validator, class-transformer |
| Database | PostgreSQL 16 |
| ORM | Prisma 5 |
| Auth | JWT (access + refresh tokens, httpOnly cookies) |
| Package manager | pnpm workspaces |

The backend is a modular monolith. Each feature (customers, devices, tickets, payments, reports) is a NestJS module that owns its own routes, service logic, and database queries. The frontend uses Next.js App Router with Server Components for data fetching and Client Components only where interactivity is required.

## Prerequisites

| Tool | Version |
|---|---|
| Node.js | 20.x or later |
| pnpm | 9.x or later |
| Docker & Docker Compose | any recent version |
| PostgreSQL | 16 (or use Docker) |

Install pnpm if you don't have it:

```bash
npm install -g pnpm
```

## Installation

```bash
# 1. Clone the repository
git clone <repo-url>
cd repair-shop

# 2. Install dependencies
pnpm install

# 3. Set up environment variables (see Environment Variables section)
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

# Edit both files with your values before continuing

# 4. Start PostgreSQL (skip if using your own instance)
docker compose up postgres -d

# 5. Run database migrations
cd apps/api
pnpm prisma:migrate

# 6. Seed the database with sample data
pnpm prisma:seed

# 7. Start both apps
cd ../..
pnpm dev
```

The API will be available at `http://localhost:3001/api` and the frontend at `http://localhost:3000`.

### Using Docker for the full stack

```bash
# Copy and edit the root .env file with your secrets first
docker compose up
```

The override file (`docker-compose.override.yml`) adds hot-reload volume mounts and an Adminer UI at `http://localhost:8080` for development.

## Environment Variables

### `apps/api/.env`

| Variable | Required | Description | Example |
|---|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string | `postgresql://postgres:password@localhost:5432/repair_shop` |
| `PORT` | No | API port (default: 3001) | `3001` |
| `NODE_ENV` | No | `development` or `production` | `development` |
| `CORS_ORIGIN` | Yes | Allowed frontend origin | `http://localhost:3000` |
| `JWT_SECRET` | Yes | Secret for signing access tokens | 32+ character random string |
| `JWT_REFRESH_SECRET` | Yes | Secret for signing refresh tokens | 32+ character random string (different from JWT_SECRET) |
| `JWT_EXPIRY` | No | Access token TTL (default: `15m`) | `15m` |
| `JWT_REFRESH_EXPIRY` | No | Refresh token TTL (default: `7d`) | `7d` |
| `DEVICE_ENCRYPTION_KEY` | Yes | 64 hex chars (32 bytes) for AES-256-GCM passcode encryption | `openssl rand -hex 32` |

Generate secure secrets:

```bash
openssl rand -hex 32   # use for JWT_SECRET
openssl rand -hex 32   # use for JWT_REFRESH_SECRET
openssl rand -hex 32   # use for DEVICE_ENCRYPTION_KEY
```

### `apps/web/.env.local`

| Variable | Required | Description | Example |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | Yes | Base URL of the NestJS API (no trailing slash) | `http://localhost:3001/api` |

## Database Setup

```bash
cd apps/api

# Apply all pending migrations (development)
pnpm prisma:migrate

# Apply migrations in production (no schema drift check)
pnpm prisma:migrate:prod

# Seed with sample data
pnpm prisma:seed

# Open Prisma Studio (visual DB browser)
pnpm prisma:studio

# Reset and re-migrate (destroys all data)
pnpm prisma:reset
```

The seed creates three accounts (password: `Password123!`):

| Email | Role |
|---|---|
| `admin@repairshop.com` | ADMIN |
| `staff@repairshop.com` | STAFF |
| `tech@repairshop.com` | TECHNICIAN |

## Development Commands

### From the repo root

```bash
pnpm dev          # start both api and web with hot reload (parallel)
pnpm build        # production build for all packages
pnpm test         # run all tests
pnpm lint         # lint all packages
pnpm typecheck    # type-check all packages
pnpm format       # format all files with Prettier
```

### API (`apps/api/`)

```bash
pnpm start:dev         # hot reload
pnpm start:prod        # run compiled production build
pnpm build             # compile TypeScript

pnpm prisma:generate   # regenerate Prisma client after schema changes
pnpm prisma:migrate    # create and apply a new migration (dev)
pnpm prisma:migrate:prod  # apply pending migrations (production)
pnpm prisma:seed       # seed the database
pnpm prisma:studio     # open Prisma Studio at http://localhost:5555
pnpm prisma:reset      # drop and re-migrate (dev only)
```

### Frontend (`apps/web/`)

```bash
pnpm dev       # development server with hot reload
pnpm build     # production build
pnpm start     # serve the production build
```

## Testing

### Unit tests

```bash
# All tests
pnpm test

# API only
cd apps/api && pnpm test

# Web only
cd apps/web && pnpm test

# Watch mode
pnpm test:watch

# Coverage report
pnpm test:cov
```

### Integration tests (API)

Integration tests require a separate test database. Create it first:

```bash
createdb repair_shop_test
# or with Docker:
docker exec -it <postgres-container> psql -U postgres -c "CREATE DATABASE repair_shop_test;"
```

Then create `apps/api/.env.test` with `DATABASE_URL` pointing to `repair_shop_test`, and run:

```bash
cd apps/api && pnpm test:integration
```

### E2E tests

```bash
# API e2e
cd apps/api && pnpm test:e2e

# Frontend e2e (Playwright)
cd apps/web && pnpm test:e2e
```

## Production Build

```bash
# Type-check and lint first
pnpm typecheck
pnpm lint

# Build the frontend
cd apps/web && pnpm build

# Build the API
cd apps/api && pnpm build

# Start the API in production mode
cd apps/api && pnpm start:prod

# Start the frontend in production mode
cd apps/web && pnpm start
```

**Before deploying:**

- Set `NODE_ENV=production` — enables `Secure` flag on cookies.
- Use strong random values for `JWT_SECRET`, `JWT_REFRESH_SECRET`, and `DEVICE_ENCRYPTION_KEY`.
- Set `CORS_ORIGIN` to your actual frontend domain.
- Run `pnpm prisma:migrate:prod` (not `prisma:migrate`) so Prisma does not prompt or drift-check the schema.
- The API runs Prisma migrations on startup only if you explicitly call them; add `prisma migrate deploy` to your deployment script before starting the server.
