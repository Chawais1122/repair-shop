---
name: architecture
description: Guide architectural decisions, enforce module boundaries, design APIs, and evaluate system trade-offs for this project
---

# Architecture Skill

Use this skill when evaluating structural decisions, proposing new modules, designing API contracts, or assessing whether a change respects established boundaries.

---

## 1. Before Making an Architectural Decision

1. Read `CLAUDE.md` to confirm the agreed stack and principles.
2. Identify which layer the decision affects: infrastructure, backend module, API contract, or frontend structure.
3. Check whether an existing module already owns the responsibility — prefer extending over adding.
4. If the decision contradicts the agreed architecture, **stop and discuss it** rather than working around it.

---

## 2. Module Boundary Rules

A NestJS module owns:
- Its Prisma queries (no other module queries its tables directly)
- Its business logic (in its service)
- Its API routes (in its controller)
- Its DTOs and response types

A module **may not**:
- Import another module's service to read data it could fetch itself
- Write to another module's tables directly
- Leak internal Prisma shapes out of its service as API responses

**Cross-module communication pattern:**
```
JobsService needs customer data
  → inject CustomersService
  → call customersService.findOne(id)
  → do NOT inject PrismaService and query customers yourself
```

---

## 3. Layering Rules

```
Request
  → Controller     (route, guard, DTO binding)
  → Service        (business logic, validation, orchestration)
  → PrismaService  (database)
  → Response
```

- Logic that belongs in the **service**: business rules, permission checks, status transition validation, error throwing, side effects (notifications).
- Logic that belongs in the **controller**: route declaration, guard application, DTO binding, calling the service, returning the result.
- Logic that belongs **nowhere else**: do not add business logic to DTOs, guards, interceptors, or middleware.

---

## 4. API Design Procedure

When designing a new endpoint:

1. **Identify the resource.** Name it as a noun (`/jobs`, `/customers`, `/parts`).
2. **Choose the correct HTTP method.**
   - `GET` — read, no side effects
   - `POST` — create a new resource
   - `PATCH` — partial update of an existing resource
   - `DELETE` — remove a resource
3. **Define the request shape.** Create a DTO with class-validator decorators.
4. **Define the response shape.** Create a response DTO or interface. Exclude sensitive fields explicitly.
5. **Assign the correct HTTP status code.** (See CLAUDE.md status code table.)
6. **Determine auth requirements.** Does this route need `JwtAuthGuard`? Does it need a role restriction?
7. **Consider idempotency.** `PATCH` and `DELETE` should be safe to retry.

URL pattern:
```
Collection:          /jobs
Single resource:     /jobs/:id
Nested resource:     /jobs/:id/items
Action on resource:  /jobs/:id/status     (PATCH)
```

Avoid verb-in-URL patterns like `/jobs/create` or `/jobs/updateStatus`.

---

## 5. Adding a New Feature — Checklist

Before writing code for a new feature:

- [ ] Does it fit inside an existing module, or does it need a new one?
- [ ] If a new module: does it have a single, clearly named responsibility?
- [ ] What are the new database entities or changes to existing ones?
- [ ] What are the new API endpoints (method, URL, request, response)?
- [ ] What existing services does it depend on?
- [ ] Does it introduce a new external dependency? If so, is there a lighter alternative?
- [ ] Does it require a Prisma migration?
- [ ] What are the authorization requirements (which roles may access it)?

---

## 6. Evaluating Trade-offs

When two approaches are viable, evaluate on:

| Criterion | Question |
|---|---|
| Simplicity | Which approach is easier to read six months from now? |
| Consistency | Which approach matches the existing pattern in this codebase? |
| Reversibility | Which approach is easier to change later? |
| Scope | Which approach does exactly what is needed — no more? |

Prefer the simpler, more consistent option unless there is a concrete reason not to.

---

## 7. What Requires a Discussion Before Proceeding

- Adding a new top-level infrastructure component (queue, cache, separate service)
- Changing the response envelope format
- Changing how authentication works
- Adding a new cross-cutting concern (new global interceptor, middleware, or pipe)
- Splitting a module into two or merging two modules
- Introducing a new shared package under `packages/`
