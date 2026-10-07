---
name: database
description: Procedures for PostgreSQL and Prisma — schema design, migrations, relationships, indexes, transactions, and query patterns
---

# Database Skill

Use this skill when modifying the Prisma schema, writing queries, designing relationships, creating migrations, or diagnosing database issues.

---

## 1. Schema Change Procedure

**Never alter the database schema manually.** All changes go through Prisma migrations.

```bash
# 1. Edit apps/api/prisma/schema.prisma
# 2. Generate and apply the migration
cd apps/api
pnpm prisma migrate dev --name describe-what-changed

# 3. Regenerate the Prisma client
pnpm prisma generate

# 4. If the migration changes a table used in seed.ts, update seed.ts
```

Migration naming: use lowercase kebab, describe the change not the table.
- Good: `--name add-job-priority-field`
- Good: `--name create-notifications-table`
- Bad: `--name update-schema`
- Bad: `--name fix`

---

## 2. Schema Design Rules

- Every table has a `String @id @default(cuid())` primary key — never use `autoincrement()` for application IDs.
- Every table has `createdAt DateTime @default(now())` and `updatedAt DateTime @updatedAt`.
- Human-readable identifiers (like `jobNumber`) are separate fields with `@unique` — they are not the primary key.
- Enum values are defined in the Prisma schema, not as raw strings in the database.
- `String?` nullable fields are used only when null has a distinct meaning from an empty string.
- Sensitive fields that need retrieval (e.g., device passcode) are stored encrypted at the application layer — the schema column is just `String`.
- Sensitive fields that do not need retrieval (e.g., password) are hashed — the schema column is named `passwordHash`.

---

## 3. Relationship Design

```prisma
// One-to-many: Customer has many Devices
model Customer {
  id      String   @id @default(cuid())
  devices Device[]
}

model Device {
  id         String   @id @default(cuid())
  customerId String
  customer   Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)
}

// One-to-one: RepairJob has one Invoice
model RepairJob {
  invoice Invoice?
}

model Invoice {
  jobId String    @unique
  job   RepairJob @relation(fields: [jobId], references: [id])
}

// Self-referencing or optional FK
model RepairJob {
  assignedToId String?
  assignedTo   User?   @relation(fields: [assignedToId], references: [id], onDelete: SetNull)
}
```

`onDelete` rules for this project:
- Child records tied to a customer or job → `Cascade`
- Optional assignment (job → technician) → `SetNull`
- Audit/history records → `Restrict` (prevent deleting a job with history)

---

## 4. Index Guidelines

Add an index when:
- A field is frequently used in a `WHERE` clause
- A field is used for `ORDER BY` on large tables
- A foreign key field (Prisma does not add FK indexes automatically)

```prisma
model RepairJob {
  status     JobStatus
  customerId String
  createdAt  DateTime  @default(now())

  @@index([status])
  @@index([customerId])
  @@index([createdAt])
  @@index([status, createdAt])  // composite for filtered + sorted list queries
}
```

Do not index every column. Index only columns with high cardinality and frequent lookup patterns.

---

## 5. Query Patterns

**Fetch only what you need — use `select` for flat data, `include` for relations:**

```typescript
// Flat select — list view
const jobs = await this.prisma.repairJob.findMany({
  where: { status },
  select: {
    id: true,
    jobNumber: true,
    status: true,
    priority: true,
    createdAt: true,
    customer: { select: { id: true, name: true, phone: true } },
    assignedTo: { select: { id: true, name: true } },
  },
  orderBy: { createdAt: 'desc' },
  skip: (page - 1) * limit,
  take: limit,
});

// Full include — detail view
const job = await this.prisma.repairJob.findUnique({
  where: { id },
  include: {
    customer: true,
    device: true,
    assignedTo: true,
    items: { include: { part: true } },
    statusHistory: { orderBy: { changedAt: 'asc' } },
    invoice: true,
  },
});
```

Never use bare `findMany()` without `take` on tables that can grow unbounded.

---

## 6. Transaction Pattern

Use `$transaction` when multiple writes must all succeed or all fail:

```typescript
// Sequential transaction (access tx client inside callback)
const result = await this.prisma.$transaction(async (tx) => {
  const job = await tx.repairJob.update({
    where: { id },
    data: { status: newStatus },
  });

  await tx.statusHistory.create({
    data: {
      jobId: id,
      fromStatus: oldStatus,
      toStatus: newStatus,
      changedById: userId,
    },
  });

  return job;
});

// Batch transaction (all succeed or none do, no inter-dependency)
await this.prisma.$transaction([
  this.prisma.part.update({ where: { id: partId }, data: { quantity: { decrement: qty } } }),
  this.prisma.jobItem.create({ data: { ... } }),
]);
```

Use the callback form when later operations depend on earlier results. Use the array form for independent operations.

---

## 7. Pagination Pattern

```typescript
async findAll(page: number, limit: number, where: Prisma.RepairJobWhereInput) {
  const [items, total] = await this.prisma.$transaction([
    this.prisma.repairJob.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    this.prisma.repairJob.count({ where }),
  ]);

  return { items, meta: { page, limit, total } };
}
```

Always return `total` alongside items so the frontend can render pagination controls.

---

## 8. Seeding

The seed file lives at `apps/api/prisma/seed.ts`.

```bash
cd apps/api
pnpm prisma:seed
```

Seed data must:
- Create at least one user per role (`ADMIN`, `FRONT_DESK`, `TECHNICIAN`)
- Create sample customers, devices, jobs in various statuses, and parts
- Be idempotent — running seed twice must not fail or create duplicates (use `upsert` or clear tables first)

---

## 9. Diagnosing Slow Queries

1. Enable Prisma query logging in development: set `log: ['query']` on `PrismaClient`.
2. Identify queries that run without an index — look for sequential scans on large tables.
3. Add the appropriate `@@index` to the schema and generate a migration.
4. Use `prisma.$queryRaw` only as a last resort for complex aggregations that Prisma cannot express.
