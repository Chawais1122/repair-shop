import Link from 'next/link';
import {
  AlertCircle,
  CircleDollarSign,
  PackageCheck,
  Plus,
  ReceiptText,
  Ticket,
  Truck,
  Users,
  Wrench,
} from 'lucide-react';
import { TicketStatus } from '@repair-shop/shared';
import { getDashboard } from '@/lib/api/reports';
import { StatCard } from '@/components/shared/stat-card';
import { RecentTicketsTable } from '@/components/shared/recent-tickets-table';
import { TicketStatusBadge } from '@/components/shared/ticket-status-badge';
import { PageHeader } from '@/components/shared/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function DashboardPage() {
  let data;
  try {
    data = await getDashboard();
  } catch {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Failed to load dashboard</AlertTitle>
        <AlertDescription>Check your connection and refresh the page.</AlertDescription>
      </Alert>
    );
  }

  const activeStatuses = [
    TicketStatus.RECEIVED,
    TicketStatus.DIAGNOSING,
    TicketStatus.WAITING_APPROVAL,
    TicketStatus.APPROVED,
    TicketStatus.REPAIRING,
    TicketStatus.READY,
  ];
  const activeTickets = activeStatuses.reduce(
    (sum, s) => sum + (data.ticketsByStatus[s] ?? 0),
    0,
  );

  const revenue = parseFloat(data.totalRevenue || '0');
  const outstanding = parseFloat(data.outstandingBalance || '0');

  const allStatuses = [
    TicketStatus.RECEIVED,
    TicketStatus.DIAGNOSING,
    TicketStatus.WAITING_APPROVAL,
    TicketStatus.APPROVED,
    TicketStatus.REPAIRING,
    TicketStatus.READY,
    TicketStatus.DELIVERED,
    TicketStatus.CANCELLED,
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        className="mb-0"
        actions={
          <Button asChild>
            <Link href="/tickets/new">
              <Plus />
              New ticket
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Customers"
          value={data.totalCustomers}
          accent="blue"
          icon={<Users />}
        />
        <StatCard label="Total Tickets" value={data.totalTickets} icon={<Ticket />} />
        <StatCard
          label="Revenue"
          value={`$${revenue.toFixed(2)}`}
          accent="green"
          icon={<CircleDollarSign />}
        />
        <StatCard
          label="Outstanding"
          value={`$${outstanding.toFixed(2)}`}
          accent={outstanding > 0 ? 'red' : 'default'}
          icon={<ReceiptText />}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tickets by Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {allStatuses.map((status) => (
              <div
                key={status}
                className="flex flex-col items-center gap-2 rounded-lg border bg-muted/30 p-3 text-center"
              >
                <p className="text-2xl font-bold">{data.ticketsByStatus[status] ?? 0}</p>
                <TicketStatusBadge status={status} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Active Tickets"
          value={activeTickets}
          accent="orange"
          sub="in progress"
          icon={<Wrench />}
        />
        <StatCard
          label="Ready for Pickup"
          value={data.ticketsByStatus[TicketStatus.READY] ?? 0}
          accent="green"
          icon={<PackageCheck />}
        />
        <StatCard
          label="Delivered"
          value={data.ticketsByStatus[TicketStatus.DELIVERED] ?? 0}
          icon={<Truck />}
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Recent Tickets</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link href="/tickets">View all</Link>
          </Button>
        </CardHeader>
        <CardContent className="px-0 pb-2">
          <RecentTicketsTable tickets={data.recentTickets} />
        </CardContent>
      </Card>
    </div>
  );
}
