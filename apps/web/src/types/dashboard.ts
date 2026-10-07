import type { Priority, TicketStatus } from '@repair-shop/shared';

export interface RecentTicket {
  id: string;
  ticketNumber: string;
  status: TicketStatus;
  priority: Priority;
  customerName: string;
  deviceLabel: string;
  createdAt: string;
}

export interface DashboardData {
  totalCustomers: number;
  totalTickets: number;
  ticketsByStatus: Record<string, number>;
  totalRevenue: string;
  outstandingBalance: string;
  recentTickets: RecentTicket[];
}
