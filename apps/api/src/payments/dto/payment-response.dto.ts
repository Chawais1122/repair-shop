import { PaymentMethod, PaymentStatus } from '@repair-shop/shared';

export class PaymentResponseDto {
  id!: string;
  ticketId!: string;
  amount!: string;
  method!: PaymentMethod;
  status!: PaymentStatus;
  transactionId!: string | null;
  paidAt!: Date | null;
  notes!: string | null;
  createdAt!: Date;
  updatedAt!: Date;
}

export class PaymentSummaryDto {
  totalCost!: string | null;
  paidAmount!: string;
  remainingAmount!: string | null;
  isFullyPaid!: boolean;
  payments!: PaymentResponseDto[];
}
