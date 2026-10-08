import { DeviceType, Priority, TicketStatus } from '@repair-shop/shared';

export class StatusHistoryItemDto {
  id!: string;
  fromStatus!: TicketStatus | null;
  toStatus!: TicketStatus;
  notes!: string | null;
  changedBy!: { id: string; name: string };
  changedAt!: Date;
}

export class TicketResponseDto {
  id!: string;
  ticketNumber!: string;
  status!: TicketStatus;
  priority!: Priority;
  reportedProblem!: string;
  diagnosis!: string | null;
  estimatedCost!: string | null;
  finalCost!: string | null;
  receivedAt!: Date;
  expectedCompletionAt!: Date | null;
  completedAt!: Date | null;
  invoicedAt!: Date | null;
  customer!: { id: string; name: string; phone: string };
  device!: { id: string; brand: string; model: string; type: DeviceType };
  assignedTo!: { id: string; name: string } | null;
  createdBy!: { id: string; name: string };
  statusHistory!: StatusHistoryItemDto[];
  createdAt!: Date;
  updatedAt!: Date;
}
