import type { InvoiceStatus, PaginatedResponse } from '@repair-shop/shared';
import type { Invoice, InvoiceSummary } from '@/types/invoice';
import { ApiError } from './client';
import { serverGet, serverGetPage } from './server';

export function getInvoices(params?: {
  search?: string;
  status?: InvoiceStatus;
  customerId?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<InvoiceSummary>> {
  return serverGetPage<InvoiceSummary>('/invoices', params);
}

export function getInvoice(id: string): Promise<Invoice> {
  return serverGet<Invoice>(`/invoices/${id}`);
}

/** The ticket's active invoice, or null when it has not been invoiced. */
export async function getTicketInvoice(ticketId: string): Promise<Invoice | null> {
  try {
    return await serverGet<Invoice>(`/tickets/${ticketId}/invoice`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}
