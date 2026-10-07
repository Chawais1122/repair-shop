import { cookies } from 'next/headers';
import { apiFetch } from './client';
import type { Customer } from '@/types/customer';
import type { PaginatedResponse } from '@repair-shop/shared';

export interface CustomerQueryParams {
  search?: string;
  page?: number;
  limit?: number;
}

async function getCookieHeader(): Promise<string> {
  const cookieStore = await cookies();
  return cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');
}

export async function getCustomers(
  params?: CustomerQueryParams,
): Promise<PaginatedResponse<Customer>> {
  const cookieHeader = await getCookieHeader();
  const qs = params
    ? new URLSearchParams(
        Object.fromEntries(
          Object.entries(params)
            .filter(([, v]) => v !== undefined && v !== '')
            .map(([k, v]) => [k, String(v)]),
        ),
      ).toString()
    : '';

  return apiFetch<PaginatedResponse<Customer>>(
    `/customers${qs ? `?${qs}` : ''}`,
    cookieHeader,
  );
}

export async function getCustomer(id: string): Promise<Customer> {
  const cookieHeader = await getCookieHeader();
  const result = await apiFetch<{ data: Customer }>(`/customers/${id}`, cookieHeader);
  return result.data;
}

export async function getCurrentUser(): Promise<{
  id: string;
  email: string;
  role: string;
} | null> {
  try {
    const cookieHeader = await getCookieHeader();
    const result = await apiFetch<{ data: { id: string; email: string; role: string } }>(
      '/auth/me',
      cookieHeader,
    );
    return result.data;
  } catch {
    return null;
  }
}
