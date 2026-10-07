# Repair Shop Management System

## Project Purpose

A web-based management system for a mobile phone and electronics repair shop. Shop staff manage repair jobs, customers, devices, inventory, and invoicing through an internal dashboard. Customers track their repairs and approve estimates via a public-facing portal. SMS and email notifications keep customers informed on job progress.

## Repository Structure

```
repair-shop/
├── apps/
│   ├── api/          ← NestJS backend (port 3001)
│   └── web/          ← Next.js frontend (port 3000)
├── packages/
│   └── shared/       ← Shared TypeScript enums and types
├── docker-compose.yml
├── docker-compose.override.yml
└── CLAUDE.md
```

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui |
| Backend | NestJS, TypeScript, class-validator, class-transformer |
| Database | PostgreSQL 16 |
| ORM | Prisma 5 (backend only) |
| Auth | JWT (access + refresh tokens, httpOnly cookies for staff; signed URL tokens for customers) |
| Validation | class-validator + class-transformer (NestJS), Zod (Next.js forms) |
| Notifications | Twilio (SMS), Resend (email) |
| Testing | Jest (unit + integration, both apps) |
| Infrastructure | Docker, Docker Compose |
| Package manager | pnpm (workspaces) |

## Architecture Principles

- **Modular monolith.** NestJS backend is organized into focused feature modules. No microservices.
- **Separation of concerns.** Business logic lives in services. Controllers are thin — they receive requests, delegate to services, and return responses.
- **Single source of truth.** Database is the source of truth. Never derive state from multiple places when one query suffices.
- **Shared types.** Enums and shared response types live in `packages/shared`. Import from there — do not duplicate them across apps.
- **No cross-module Prisma access.** Each NestJS module owns its own database queries. Modules communicate through service method calls, not shared Prisma queries.
- **Do not change the agreed architecture without discussing it first.**

## TypeScript Standards

- Strict mode is enabled in all `tsconfig.json` files. Keep it enabled.
- **Do not use `any` unless absolutely unavoidable.** Use `unknown` and narrow the type instead.
- Prefer explicit return types on public service and controller methods.
- Use `interface` for object shapes, `type` for unions and intersections.
- Enums that are shared between frontend and backend belong in `packages/shared/src/enums.ts`.
- No `@ts-ignore` or `@ts-expect-error` without a comment explaining why.
- Prefer `const` over `let`. Never use `var`.
- Prefer named exports. Avoid default exports except in Next.js `page.tsx` and `layout.tsx` files.

## NestJS Standards

### Module structure

Each feature module contains:
```
feature/
  feature.module.ts
  feature.controller.ts   ← route handlers only, no business logic
  feature.service.ts      ← all business logic
  dto/
    create-feature.dto.ts
    update-feature.dto.ts
    feature-response.dto.ts
```

### Controllers

- Keep controllers thin. A controller method should: validate input (via pipes), call a service method, and return the result.
- Do not write database queries, conditional business logic, or side effects in controllers.
- Decorate all routes with `@UseGuards(JwtAuthGuard)` and `@Roles(...)` as appropriate.
- Always declare the response type explicitly.

### Services

- All business logic belongs in services.
- Services may call other services via injection — never reach into another module's repository directly.
- Services are responsible for throwing the correct NestJS HTTP exceptions (`NotFoundException`, `BadRequestException`, `ForbiddenException`, etc.).
- Do not duplicate business logic across services. Extract shared logic into a common helper or a dedicated service.

### DTOs

- Use DTOs for all API input. Never accept raw `body` objects.
- Decorate DTO properties with `class-validator` decorators.
- Use `class-transformer` `@Expose()` and `@Exclude()` for response shaping when needed.
- Keep DTOs focused — one DTO per operation, not a god object with optional fields for every case.

### Dependency injection

- Use constructor injection. Do not use property injection.
- The `PrismaService` is a global module — inject it directly where needed; do not wrap it per-module.

### Guards and decorators

- `JwtAuthGuard` — applied to all staff routes.
- `RolesGuard` — applied where role restriction is needed, always paired with `@Roles(...)`.
- `@CurrentUser()` — custom parameter decorator to extract the authenticated user from the JWT payload.

## Next.js Standards

### Route organization

```
app/
  (auth)/       ← login pages (no sidebar)
  (staff)/      ← protected staff routes (sidebar layout)
  (customer)/   ← public customer portal (minimal layout)
```

### Data fetching

- Server Components are the default. Use them for all data fetching.
- Use `'use client'` only when the component requires browser APIs, event handlers, or React state.
- Client components that need server data use TanStack Query (`useQuery`, `useMutation`).
- Never fetch data in a Client Component on initial render when a Server Component can do it instead.

### API calls

- All calls to the NestJS API go through a centralized `lib/api/` client. Do not use raw `fetch()` spread across components.
- The API base URL comes from `NEXT_PUBLIC_API_URL` environment variable.
- JWT is forwarded from the httpOnly cookie automatically via the API client helper — do not pass tokens manually.

### Forms

- Use React Hook Form for all forms.
- Validate with Zod schemas. Define schemas in `lib/validation/` and reuse them across the form and any server-side helpers.
- Never submit unvalidated data.

### Components

- `components/ui/` — shadcn/ui primitives. Do not modify these files directly; extend them in `components/shared/`.
- `components/shared/` — app-level reusable components.
- Feature-specific components are co-located with their route directory.

## Prisma Standards

- The Prisma schema lives at `apps/api/prisma/schema.prisma`.
- All database changes go through Prisma migrations. Never alter the database schema manually.
- Generate a named migration for every schema change: `prisma migrate dev --name describe-the-change`.
- `PrismaService` is the only place the `PrismaClient` is instantiated — it is injected everywhere else.
- Use Prisma's `select` and `include` deliberately. Do not over-fetch columns or relations by default.
- Sensitive fields (e.g. `passwordHash`, `passcode`) must be explicitly excluded in response mappings — never returned by accident.
- Transactions are required when multiple writes must succeed or fail together.

## API Conventions

### Response envelope

All API responses use a consistent shape:

```typescript
// Success
{ "data": T }

// Paginated
{ "data": T[], "meta": { "page": number, "limit": number, "total": number } }

// Error
{ "statusCode": number, "message": string, "error": string }
```

The global `TransformInterceptor` wraps all successful responses. Do not wrap manually inside controllers.

### HTTP status codes

| Operation | Code |
|---|---|
| GET (found) | 200 |
| POST (created) | 201 |
| PATCH / PUT | 200 |
| DELETE | 200 or 204 |
| Validation error | 400 |
| Unauthenticated | 401 |
| Forbidden (wrong role) | 403 |
| Not found | 404 |
| Conflict (duplicate) | 409 |
| Server error | 500 |

### URL structure

```
/auth/login
/auth/refresh
/auth/logout
/auth/customer/track

/users
/users/:id

/customers
/customers/:id
/customers/:id/devices
/customers/:id/jobs

/jobs
/jobs/:id
/jobs/:id/status
/jobs/:id/items
/jobs/:id/invoice
/jobs/:id/notifications

/parts
/parts/:id

/invoices
/invoices/:id
/invoices/:id/payments

/reports/dashboard
```

### Pagination

Paginated endpoints accept `?page=1&limit=20`. Default limit is 20, maximum is 100.

### Filtering

Filter parameters are passed as query strings: `?status=IN_PROGRESS&assignedTo=<userId>`.

## Validation

- **All external input must be validated.** This includes HTTP request bodies, query parameters, and route parameters.
- NestJS: use the global `ValidationPipe` with `whitelist: true` and `forbidNonWhitelisted: true`. This strips undeclared properties and rejects unknown fields.
- Next.js forms: validate with Zod before calling the API.
- Never trust data coming from the client — re-validate in the service layer when it matters (e.g. status transition rules).
- Status transitions are validated server-side against an allowed-transitions map. The client cannot freely set any status.

## Error Handling

- Services throw NestJS HTTP exceptions. The global `HttpExceptionFilter` catches them and formats the error response envelope.
- Do not throw generic `Error` objects from services — use the correct NestJS exception class.
- Do not leak stack traces, internal IDs, or database error details to API responses.
- Log errors with sufficient context (job ID, user ID, operation) but never log passwords, tokens, or passcodes.
- Unhandled promise rejections must be caught. Use `async/await` with `try/catch` in service methods that have side effects.

## Authentication

### Staff (JWT, httpOnly cookies)

- `POST /auth/login` issues an `accessToken` (15-minute TTL) and a `refreshToken` (7-day TTL), both as `httpOnly`, `Secure`, `SameSite=Strict` cookies.
- `POST /auth/refresh` issues a new `accessToken` using the `refreshToken` cookie.
- `POST /auth/logout` clears both cookies.
- All staff routes are protected by `JwtAuthGuard`. A missing or expired token returns `401`.
- Role-restricted routes use `RolesGuard` + `@Roles(UserRole.ADMIN)`. Wrong role returns `403`.

### Customer portal (stateless signed token)

- `POST /auth/customer/track` accepts `{ jobNumber, phoneLast4 }` and returns a short-lived signed JWT (2-hour TTL) scoped to that job.
- The token is embedded in the customer-facing URL and in SMS/email links.
- Customer routes verify this token but do not use `JwtAuthGuard` — they use a dedicated `CustomerTokenGuard`.
- The customer token payload contains only `{ jobId, customerId }` — no PII beyond what is needed.

## Security

- **Never hardcode secrets.** All secrets and credentials come from environment variables.
- Passwords are hashed with `bcrypt` (minimum cost factor 12). Never store plaintext passwords.
- Device passcodes are encrypted with AES-256-GCM. Never store them plaintext. The encryption key is an environment variable.
- The `passwordHash` and `passcode` fields are never included in API responses. Map them out explicitly.
- Use parameterized queries only. Prisma handles this — do not construct raw SQL with string concatenation.
- JWT secrets are long random strings from environment variables, not hardcoded defaults.
- CORS is configured explicitly in NestJS — do not use `origin: '*'` in production.
- HTTP headers are hardened via Helmet middleware in the NestJS app.
- Rate-limit the `/auth/login` and `/auth/customer/track` endpoints.

## Testing

- Write tests for all service methods that contain meaningful business logic.
- Unit tests mock the `PrismaService`. Integration tests use a real test database (`repair_shop_test`) seeded via factory functions.
- Test files are co-located with their source: `feature.service.spec.ts` next to `feature.service.ts`.
- E2E tests live in `apps/api/test/` (NestJS) and `apps/web/e2e/` (Playwright).
- **Run relevant tests after making changes.** Do not submit code that breaks existing tests.
- Test the unhappy path: invalid input, missing records, forbidden role, failed status transition.
- Do not mock Prisma in integration tests — hit the real test database.
- Use `beforeEach` to reset and reseed the test database, not `beforeAll`.

### Commands

```bash
# API
cd apps/api
pnpm test              # unit tests
pnpm test:integration  # integration tests (requires test DB)
pnpm test:e2e          # end-to-end tests

# Web
cd apps/web
pnpm test              # unit + component tests
pnpm test:e2e          # Playwright end-to-end
```

## Git Conventions

### Branch naming

```
feat/short-description       ← new feature
fix/short-description        ← bug fix
chore/short-description      ← tooling, deps, config
test/short-description       ← tests only
docs/short-description       ← documentation only
```

All branches target `dev`. Only `dev` merges into `main` via PR.

### Commit messages (Conventional Commits)

```
feat(jobs): add bulk status update endpoint
fix(invoice): correct tax rounding on partial payments
chore(deps): upgrade prisma to 5.x
test(auth): add integration tests for token refresh
docs(claude): update API conventions section
```

Format: `type(scope): short imperative description`
- `type`: `feat`, `fix`, `chore`, `test`, `docs`, `refactor`
- `scope`: the NestJS module or Next.js area affected
- Description: lowercase, imperative, no trailing period, under 72 characters

### Pull requests

- All PRs require passing CI (lint, type-check, tests) before merge.
- Squash merge into `dev` to keep history linear.
- If the PR includes a Prisma migration, note it in the PR description.

## Development Commands

```bash
# Start full stack (Docker)
docker compose up

# API — from apps/api/
pnpm start:dev          # hot reload
pnpm prisma:migrate     # run pending migrations
pnpm prisma:seed        # seed development data
pnpm prisma:studio      # open Prisma Studio

# Web — from apps/web/
pnpm dev                # hot reload

# From repo root
pnpm lint               # lint all apps
pnpm typecheck          # type-check all apps
pnpm test               # run all tests
```

## Agent Rules

- Read the target file before editing it. No blind writes.
- Do not make changes unrelated to the current task.
- Do not install new dependencies without explaining what they do and why they are needed.
- Schema changes require a new Prisma migration. Never edit the database directly.
- Business logic belongs in services. Do not add logic to controllers or route handlers.
- If a required change conflicts with the agreed architecture, stop and discuss it rather than working around it.
