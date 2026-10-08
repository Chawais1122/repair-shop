import { TicketStatus } from './enums';

// Single source of truth for allowed ticket status changes — enforced by the API, mirrored in the UI.
export const ALLOWED_TICKET_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
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

export function canTransitionTicket(from: TicketStatus, to: TicketStatus): boolean {
  return ALLOWED_TICKET_TRANSITIONS[from].includes(to);
}
