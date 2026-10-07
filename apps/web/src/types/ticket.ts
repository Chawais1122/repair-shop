import { DeviceType, Priority, TicketStatus } from '@repair-shop/shared';

export interface StatusHistoryItem {
  id: string;
  fromStatus: TicketStatus | null;
  toStatus: TicketStatus;
  notes: string | null;
  changedBy: { id: string; name: string };
  changedAt: string;
}

export interface Ticket {
  id: string;
  ticketNumber: string;
  status: TicketStatus;
  priority: Priority;
  reportedProblem: string;
  diagnosis: string | null;
  estimatedCost: string | null;
  finalCost: string | null;
  receivedAt: string;
  expectedCompletionAt: string | null;
  completedAt: string | null;
  customer: { id: string; name: string; phone: string };
  device: { id: string; brand: string; model: string; type: DeviceType };
  assignedTo: { id: string; name: string } | null;
  createdBy: { id: string; name: string };
  statusHistory: StatusHistoryItem[];
  createdAt: string;
  updatedAt: string;
}

export interface Technician {
  id: string;
  name: string;
  email: string;
}
