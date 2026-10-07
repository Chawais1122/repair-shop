---
name: frontend
description: Procedures for Next.js development — components, pages, forms, API integration, and handling loading/error/empty states
---

# Frontend Skill

Use this skill when working on any Next.js code: building pages, creating components, wiring up forms, calling the backend API, or handling UI states.

---

## 1. Deciding Server Component vs Client Component

Start with a Server Component. Add `'use client'` only when the component needs one of:
- `useState`, `useReducer`, or `useEffect`
- Browser APIs (`window`, `document`, `localStorage`)
- Event handlers on interactive elements (`onClick`, `onChange`)
- TanStack Query hooks (`useQuery`, `useMutation`)

If a component only displays data passed to it as props, it is a Server Component even if it renders buttons — the handlers live in a child Client Component.

**Do not add `'use client'` to page files** unless the entire page is interactive. Extract the interactive part into a `*-client.tsx` component and keep the page as a Server Component for data fetching.

---

## 2. Page File Pattern (Server Component)

```typescript
// app/(staff)/jobs/[id]/page.tsx
import { notFound } from 'next/navigation';
import { getJob } from '@/lib/api/jobs';
import { JobDetailClient } from './job-detail-client';

interface Props {
  params: { id: string };
}

export default async function JobDetailPage({ params }: Props) {
  const job = await getJob(params.id);
  if (!job) notFound();
  return <JobDetailClient job={job} />;
}
```

Rules:
- `page.tsx` is async and fetches data. It does not contain JSX event handlers.
- Pass fetched data down as props to a Client Component for interactive behavior.
- Use Next.js `notFound()` for missing resources — it renders the nearest `not-found.tsx`.
- Use `error.tsx` for unexpected fetch errors (must be a Client Component with `'use client'`).

---

## 3. Client Component Pattern

```typescript
// app/(staff)/jobs/[id]/job-detail-client.tsx
'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateJobStatus } from '@/lib/api/jobs';
import type { Job } from '@/types/job';

interface Props {
  job: Job;
}

export function JobDetailClient({ job }: Props) {
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: (status: JobStatus) => updateJobStatus(job.id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['jobs', job.id] }),
  });

  return ( ... );
}
```

---

## 4. API Client Pattern

All backend calls go through `lib/api/`. Never use raw `fetch` scattered across components.

```typescript
// lib/api/client.ts — base fetch wrapper
async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    ...init,
    credentials: 'include', // sends httpOnly cookie automatically
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new ApiError(res.status, error.message ?? 'Request failed');
  }
  const body = await res.json();
  return body.data as T; // unwrap the { data } envelope
}

// lib/api/jobs.ts
export async function getJob(id: string): Promise<Job> {
  return apiRequest<Job>(`/jobs/${id}`);
}

export async function updateJobStatus(id: string, status: JobStatus): Promise<Job> {
  return apiRequest<Job>(`/jobs/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}
```

---

## 5. Form Pattern

```typescript
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const createJobSchema = z.object({
  intakeNotes: z.string().min(1, 'Required').max(1000),
  customerId: z.string().uuid(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
});

type CreateJobValues = z.infer<typeof createJobSchema>;

export function CreateJobForm() {
  const form = useForm<CreateJobValues>({
    resolver: zodResolver(createJobSchema),
    defaultValues: { priority: 'NORMAL' },
  });

  const onSubmit = async (values: CreateJobValues) => {
    try {
      await createJob(values);
      router.push('/jobs');
    } catch (err) {
      form.setError('root', { message: getErrorMessage(err) });
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {form.formState.errors.root && (
        <p role="alert">{form.formState.errors.root.message}</p>
      )}
      ...
    </form>
  );
}
```

Rules:
- Zod schema is defined at the top of the file, before the component.
- `z.infer<typeof schema>` generates the TypeScript type — do not write it separately.
- API errors are caught in `onSubmit` and set on `form.setError('root', ...)`.
- Show a `role="alert"` element for root errors so screen readers announce them.

---

## 6. Loading, Error, and Empty States

Every data-fetching page must handle all three states. Use Next.js colocation:

```
app/(staff)/jobs/
  page.tsx          ← data fetching
  loading.tsx       ← shown by Next.js during fetch (Suspense boundary)
  error.tsx         ← shown when page.tsx throws ('use client' required)
  not-found.tsx     ← shown when notFound() is called
```

For loading state in Client Components using TanStack Query:
```typescript
if (isPending) return <Skeleton />;
if (isError) return <ErrorMessage error={error} />;
if (!data || data.length === 0) return <EmptyState message="No jobs found" />;
```

Do not return `null` for loading or error — always render something meaningful.

---

## 7. Component File Conventions

```
components/
  ui/              ← shadcn/ui primitives (do not modify)
  shared/          ← reusable app components (StatusBadge, JobCard, etc.)

app/(staff)/jobs/
  page.tsx
  loading.tsx
  error.tsx
  job-detail-client.tsx   ← feature component, co-located with route
  components/             ← sub-components used only on this route
    job-items-table.tsx
    status-change-modal.tsx
```

Naming:
- Files: `kebab-case.tsx`
- Exported components: `PascalCase`
- No default exports except `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`

---

## 8. Implementing a New Page — Procedure

1. Create `app/(staff)/route/page.tsx` as an async Server Component.
2. Add `loading.tsx` with a skeleton layout.
3. Add `error.tsx` as a Client Component.
4. Fetch data in `page.tsx` using a function from `lib/api/`.
5. Pass data to a `*-client.tsx` component for any interactive behavior.
6. Handle the empty state inside the Client Component.
7. Test: navigate to the page, verify loading, verify error (disconnect the API), verify empty.

---

## 9. Responsive UI Guidelines

- Mobile-first Tailwind: base styles target small screens, `md:` and `lg:` for larger.
- Staff dashboard is designed for tablet and desktop (minimum viewport: 768px).
- Customer portal must work on mobile (customers use phones).
- Use `shadcn/ui` Sheet for mobile-friendly slide-out panels instead of modals on small screens.
- Test at 375px (mobile), 768px (tablet), and 1280px (desktop) widths.
