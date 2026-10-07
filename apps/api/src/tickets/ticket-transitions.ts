import { TicketStatus } from '@repair-shop/shared';

export const ALLOWED_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  [TicketStatus.RECEIVED]: [TicketStatus.DIAGNOSING, TicketStatus.CANCELLED],
  [TicketStatus.DIAGNOSING]: [
    TicketStatus.WAITING_APPROVAL,
    TicketStatus.REPAIRING,
    TicketStatus.CANCELLED,
  ],
  [TicketStatus.WAITING_APPROVAL]: [TicketStatus.APPROVED, TicketStatus.CANCELLED],
  [TicketStatus.APPROVED]: [TicketStatus.REPAIRING, TicketStatus.CANCELLED],
  [TicketStatus.REPAIRING]: [TicketStatus.READY, TicketStatus.CANCELLED],
  [TicketStatus.READY]: [TicketStatus.DELIVERED, TicketStatus.CANCELLED],
  [TicketStatus.DELIVERED]: [],
  [TicketStatus.CANCELLED]: [],
};
