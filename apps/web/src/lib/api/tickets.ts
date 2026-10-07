import { cookies } from 'next/headers';
import { apiFetch } from './client';
import type { Ticket, Technician } from '@/types/ticket';
import type { PaginatedResponse } from '@repair-shop/shared';
import { TicketStatus } from '@repair-shop/shared';

export interface TicketQueryParams {
  search?: string;
  status?: TicketStatus;
  assignedToId?: string;
  customerId?: string;
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

export async function getTickets(
  params?: TicketQueryParams,
): Promise<PaginatedResponse<Ticket>> {
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

  return apiFetch<PaginatedResponse<Ticket>>(
    `/tickets${qs ? `?${qs}` : ''}`,
    cookieHeader,
  );
}

export async function getTicket(id: string): Promise<Ticket> {
  const cookieHeader = await getCookieHeader();
  const result = await apiFetch<{ data: Ticket }>(`/tickets/${id}`, cookieHeader);
  return result.data;
}

export async function getTechnicians(): Promise<Technician[]> {
  const cookieHeader = await getCookieHeader();
  const result = await apiFetch<{ data: Technician[] }>('/users/technicians', cookieHeader);
  return result.data;
}
