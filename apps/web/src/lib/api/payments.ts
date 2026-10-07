import { cookies } from 'next/headers';
import { apiFetch } from './client';
import type { PaymentSummary } from '@/types/payment';

async function getCookieHeader(): Promise<string> {
  const cookieStore = await cookies();
  return cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');
}

export async function getPaymentSummary(ticketId: string): Promise<PaymentSummary> {
  const cookieHeader = await getCookieHeader();
  const result = await apiFetch<{ data: PaymentSummary }>(
    `/tickets/${ticketId}/payments`,
    cookieHeader,
  );
  return result.data;
}
