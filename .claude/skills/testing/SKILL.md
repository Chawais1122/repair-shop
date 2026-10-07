---
name: testing
description: Procedures for writing and running unit, integration, API, and frontend tests across the monorepo
---

# Testing Skill

Use this skill when writing new tests, fixing failing tests, deciding what to test, or running the test suite after changes.

---

## 1. What to Test

**Always test:**
- Service methods with business logic (status transitions, permission checks, calculations)
- Functions that can fail in non-obvious ways (encryption, token generation, fee calculation)
- Validation rules that protect data integrity

**Test the unhappy path, not just the happy path:**
- Invalid input (missing required field, wrong type, out-of-range value)
- Missing records (`NotFoundException`)
- Forbidden operations (wrong role, invalid status transition)
- External service failure (Twilio down, Resend error)

**Do not write tests for:**
- Prisma internals (the ORM is already tested by Prisma)
- Simple pass-through controller methods with no logic
- Framework boilerplate (module registration, decorator application)

---

## 2. Unit Test Pattern (NestJS Service)

Unit tests mock `PrismaService` and other injected services. They test logic in isolation.

```typescript
// jobs.service.spec.ts
describe('JobsService', () => {
  let service: JobsService;
  let prisma: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        JobsService,
        { provide: PrismaService, useValue: mockDeep<PrismaService>() },
        { provide: NotificationsService, useValue: { onStatusChange: jest.fn() } },
      ],
    }).compile();

    service = module.get(JobsService);
    prisma = module.get(PrismaService);
  });

  describe('findOne', () => {
    it('returns the job when found', async () => {
      prisma.repairJob.findUnique.mockResolvedValue(mockJob);
      const result = await service.findOne('job-id');
      expect(result.id).toBe('job-id');
    });

    it('throws NotFoundException when job does not exist', async () => {
      prisma.repairJob.findUnique.mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    it('rejects an invalid status transition', async () => {
      prisma.repairJob.findUnique.mockResolvedValue({ ...mockJob, status: 'INTAKE' });
      await expect(
        service.updateStatus('job-id', { status: 'COMPLETED' }, 'user-id'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
```

---

## 3. Integration Test Pattern (NestJS — Real Database)

Integration tests hit a real PostgreSQL test database. They test the full service → Prisma → database path.

```typescript
// jobs.integration.spec.ts
describe('JobsService (integration)', () => {
  let service: JobsService;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule], // full module wiring
    }).compile();

    service = module.get(JobsService);
    prisma = module.get(PrismaService);
  });

  beforeEach(async () => {
    await resetTestDatabase(prisma); // truncate + reseed
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('creates a StatusHistory record on valid status transition', async () => {
    const { job } = await seedJobInStatus(prisma, 'INTAKE');

    await service.updateStatus(job.id, { status: 'DIAGNOSED' }, seedUser.id);

    const history = await prisma.statusHistory.findFirst({ where: { jobId: job.id } });
    expect(history?.fromStatus).toBe('INTAKE');
    expect(history?.toStatus).toBe('DIAGNOSED');
  });
});
```

**Test database setup:**
- Uses a separate database: `repair_shop_test`
- Set via `DATABASE_URL` in `.env.test`
- `resetTestDatabase` truncates all tables in dependency order and reseeds minimal fixture data
- Each test starts from a known state — `beforeEach` not `beforeAll` for reset

---

## 4. API / E2E Test Pattern (NestJS Supertest)

E2E tests spin up the full NestJS application and make HTTP requests.

```typescript
// test/jobs.e2e-spec.ts
describe('Jobs API (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    applyAppConfig(app); // same pipes, guards, interceptors as main.ts
    await app.init();

    authToken = await loginAsAdmin(app); // helper that calls POST /auth/login
  });

  afterAll(() => app.close());

  describe('PATCH /jobs/:id/status', () => {
    it('returns 200 and updated status on valid transition', async () => {
      const job = await createSeedJob(prisma, 'INTAKE');

      const res = await request(app.getHttpServer())
        .patch(`/jobs/${job.id}/status`)
        .set('Cookie', `accessToken=${authToken}`)
        .send({ status: 'DIAGNOSED' })
        .expect(200);

      expect(res.body.data.status).toBe('DIAGNOSED');
    });

    it('returns 400 for an invalid transition', async () => {
      const job = await createSeedJob(prisma, 'INTAKE');

      await request(app.getHttpServer())
        .patch(`/jobs/${job.id}/status`)
        .set('Cookie', `accessToken=${authToken}`)
        .send({ status: 'COMPLETED' })
        .expect(400);
    });

    it('returns 401 without auth token', async () => {
      await request(app.getHttpServer())
        .patch('/jobs/any-id/status')
        .send({ status: 'DIAGNOSED' })
        .expect(401);
    });
  });
});
```

---

## 5. Frontend Component Test Pattern (React Testing Library)

```typescript
// components/shared/status-badge.test.tsx
import { render, screen } from '@testing-library/react';
import { StatusBadge } from './status-badge';

describe('StatusBadge', () => {
  it('renders the correct label for READY_FOR_PICKUP', () => {
    render(<StatusBadge status="READY_FOR_PICKUP" />);
    expect(screen.getByText('Ready for Pickup')).toBeInTheDocument();
  });

  it('applies the correct color class for CANCELLED', () => {
    const { container } = render(<StatusBadge status="CANCELLED" />);
    expect(container.firstChild).toHaveClass('bg-red-100');
  });
});
```

For interactive components, use `userEvent` from `@testing-library/user-event` — not `fireEvent`.

---

## 6. Test Execution

```bash
# Run all unit tests (API)
cd apps/api && pnpm test

# Run with coverage
cd apps/api && pnpm test:cov

# Run integration tests (requires test DB running)
cd apps/api && pnpm test:integration

# Run e2e tests
cd apps/api && pnpm test:e2e

# Run frontend tests
cd apps/web && pnpm test

# Run Playwright e2e (requires full stack running)
cd apps/web && pnpm test:e2e

# Run all tests from root
pnpm test
```

**After making changes:**
- Run `pnpm test` in the app you changed.
- If you changed a service, also run integration tests for that service.
- If you changed the Prisma schema, run the full API test suite.
- Never skip tests because they are slow — fix the underlying issue instead.

---

## 7. Test Helpers and Fixtures

Keep test helpers in:
```
apps/api/test/
  helpers/
    reset-database.ts    ← truncate + reseed
    seed-factories.ts    ← createJob(), createCustomer(), etc.
    auth-helpers.ts      ← loginAsAdmin(), loginAsTechnician()
```

Factory functions return the created record and accept partial overrides:
```typescript
export async function createSeedJob(
  prisma: PrismaService,
  status: JobStatus = 'INTAKE',
  overrides: Partial<Prisma.RepairJobCreateInput> = {},
): Promise<RepairJob> { ... }
```

---

## 8. Regression Testing

When fixing a bug:
1. Write a failing test that reproduces the bug **before** fixing it.
2. Fix the bug.
3. Confirm the test now passes.
4. Commit test and fix together.

This ensures the bug cannot silently return.
