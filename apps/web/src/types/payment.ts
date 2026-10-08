import { PaymentMethod, PaymentStatus } from '@repair-shop/shared';

export interface Payment {
  id: string;
  ticketId: string | null;
  invoiceId: string | null;
  amount: string;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionId: string | null;
  paidAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentSummary {
  totalCost: string | null;
  paidAmount: string;
  remainingAmount: string | null;
  isFullyPaid: boolean;
  payments: Payment[];
}
