import { z } from 'zod';
import { Priority, TicketStatus } from '@repair-shop/shared';

export const createTicketSchema = z.object({
  customerId: z.string().min(1, 'Select a customer'),
  deviceId: z.string().min(1, 'Select a device'),
  priority: z.enum([
    Priority.LOW,
    Priority.NORMAL,
    Priority.HIGH,
    Priority.URGENT,
  ] as [Priority, ...Priority[]]).optional(),
  reportedProblem: z.string().min(1, 'Problem description is required'),
  expectedCompletionAt: z.string().optional(),
});

export const updateTicketSchema = z.object({
  priority: z.enum([
    Priority.LOW,
    Priority.NORMAL,
    Priority.HIGH,
    Priority.URGENT,
  ] as [Priority, ...Priority[]]).optional(),
  reportedProblem: z.string().min(1).optional(),
  diagnosis: z.string().optional(),
  estimatedCost: z.number().min(0).optional(),
  finalCost: z.number().min(0).optional(),
  expectedCompletionAt: z.string().optional(),
});

export const updateStatusSchema = z.object({
  status: z.enum([
    TicketStatus.RECEIVED,
    TicketStatus.DIAGNOSING,
    TicketStatus.WAITING_APPROVAL,
    TicketStatus.APPROVED,
    TicketStatus.REPAIRING,
    TicketStatus.READY,
    TicketStatus.DELIVERED,
    TicketStatus.CANCELLED,
  ] as [TicketStatus, ...TicketStatus[]]),
  notes: z.string().optional(),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
