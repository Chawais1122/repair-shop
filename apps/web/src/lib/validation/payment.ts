import { z } from 'zod';
import { PaymentMethod, PaymentStatus } from '@repair-shop/shared';

export const addPaymentSchema = z.object({
  amount: z.number().min(0.01, 'Must be at least $0.01'),
  method: z.enum([
    PaymentMethod.CASH,
    PaymentMethod.CARD,
    PaymentMethod.BANK_TRANSFER,
  ] as [PaymentMethod, ...PaymentMethod[]]),
  status: z.enum([
    PaymentStatus.PENDING,
    PaymentStatus.COMPLETED,
    PaymentStatus.REFUNDED,
  ] as [PaymentStatus, ...PaymentStatus[]]),
  transactionId: z.string().optional(),
  notes: z.string().optional(),
});

export type AddPaymentFormValues = z.infer<typeof addPaymentSchema>;
