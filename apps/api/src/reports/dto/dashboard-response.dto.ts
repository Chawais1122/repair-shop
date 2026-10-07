import { Priority, TicketStatus } from '@repair-shop/shared';

export class RecentTicketDto {
  id!: string;
  ticketNumber!: string;
  status!: TicketStatus;
  priority!: Priority;
  customerName!: string;
  deviceLabel!: string;
  createdAt!: Date;
}

export class DashboardResponseDto {
  totalCustomers!: number;
  totalTickets!: number;
  ticketsByStatus!: Record<TicketStatus, number>;
  totalRevenue!: string;
  outstandingBalance!: string;
  recentTickets!: RecentTicketDto[];
}
