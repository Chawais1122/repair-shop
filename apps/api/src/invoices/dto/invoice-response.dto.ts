import { InvoiceStatus } from '@repair-shop/shared';
import { PaymentResponseDto } from '../../payments/dto/payment-response.dto';

export class InvoiceItemResponseDto {
  id!: string;
  partId!: string | null;
  fromTicket!: boolean;
  description!: string;
  quantity!: number;
  unitPrice!: string;
  lineTotal!: string;
}

export class InvoiceSummaryDto {
  id!: string;
  invoiceNumber!: string;
  status!: InvoiceStatus;
  customer!: { id: string; name: string; phone: string } | null;
  ticket!: { id: string; ticketNumber: string } | null;
  total!: string;
  createdBy!: { id: string; name: string };
  createdAt!: Date;
}

export class InvoiceResponseDto extends InvoiceSummaryDto {
  subtotal!: string;
  discount!: string;
  taxRate!: string;
  taxAmount!: string;
  amountPaid!: string;
  balanceDue!: string;
  notes!: string | null;
  items!: InvoiceItemResponseDto[];
  payments!: PaymentResponseDto[];
  voidedAt!: Date | null;
  voidedBy!: { id: string; name: string } | null;
  voidReason!: string | null;
  updatedAt!: Date;
}
