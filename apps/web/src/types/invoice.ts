import { InvoiceStatus } from '@repair-shop/shared';
import type { Payment } from './payment';

export interface InvoiceSummary {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  customer: { id: string; name: string; phone: string } | null;
  ticket: { id: string; ticketNumber: string } | null;
  total: string;
  createdBy: { id: string; name: string };
  createdAt: string;
}

export interface InvoiceItem {
  id: string;
  partId: string | null;
  fromTicket: boolean;
  description: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
}

export interface Invoice extends InvoiceSummary {
  subtotal: string;
  discount: string;
  taxRate: string;
  taxAmount: string;
  amountPaid: string;
  balanceDue: string;
  notes: string | null;
  items: InvoiceItem[];
  payments: Payment[];
  voidedAt: string | null;
  voidedBy: { id: string; name: string } | null;
  voidReason: string | null;
  updatedAt: string;
}
