import { cookies } from 'next/headers';
import type { PaginatedResponse } from '@repair-shop/shared';
import { apiFetch } from './client';

type QueryValue = string | number | boolean | undefined | null;

/** Forwards the staff session cookies from the incoming request to the API. */
export async function getCookieHeader(): Promise<string> {
  const cookieStore = await cookies();
  return cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');
}

export function toQueryString(params?: Record<string, QueryValue>): string {
  if (!params) return '';
  const qs = new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => [k, String(v)]),
  ).toString();
  return qs ? `?${qs}` : '';
}

/** GET a `{ data: T }` endpoint from a Server Component and unwrap the envelope. */
export async function serverGet<T>(path: string, params?: Record<string, QueryValue>): Promise<T> {
  const result = await apiFetch<{ data: T }>(
    `${path}${toQueryString(params)}`,
    await getCookieHeader(),
  );
  return result.data;
}

/** GET a paginated endpoint from a Server Component. */
export async function serverGetPage<T>(
  path: string,
  params?: Record<string, QueryValue>,
): Promise<PaginatedResponse<T>> {
  return apiFetch<PaginatedResponse<T>>(`${path}${toQueryString(params)}`, await getCookieHeader());
}
