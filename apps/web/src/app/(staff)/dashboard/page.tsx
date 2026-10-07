import { getDashboard } from '@/lib/api/reports';
import { StatCard } from '@/components/shared/stat-card';
import { RecentTicketsTable } from '@/components/shared/recent-tickets-table';
import { TicketStatusBadge } from '@/components/shared/ticket-status-badge';
import { TicketStatus } from '@repair-shop/shared';

export default async function DashboardPage() {
  let data;
  try {
    data = await getDashboard();
  } catch {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="font-medium text-red-700">Failed to load dashboard</p>
        <p className="mt-1 text-sm text-red-500">
          Check your connection and refresh the page.
        </p>
      </div>
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
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Customers" value={data.totalCustomers} accent="blue" />
        <StatCard label="Total Tickets" value={data.totalTickets} />
        <StatCard label="Revenue" value={`$${revenue.toFixed(2)}`} accent="green" />
        <StatCard
          label="Outstanding"
          value={`$${outstanding.toFixed(2)}`}
          accent={outstanding > 0 ? 'red' : 'default'}
        />
      </div>

      <section>
        <h2 className="mb-3 text-base font-semibold text-gray-700">Tickets by Status</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {allStatuses.map((status) => (
            <div
              key={status}
              className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm text-center"
            >
              <p className="text-2xl font-bold text-gray-900">
                {data.ticketsByStatus[status] ?? 0}
              </p>
              <div className="mt-1 flex justify-center">
                <TicketStatusBadge status={status} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Active Tickets" value={activeTickets} accent="orange" sub="in progress" />
        <StatCard
          label="Ready for Pickup"
          value={data.ticketsByStatus[TicketStatus.READY] ?? 0}
          accent="green"
        />
        <StatCard
          label="Delivered"
          value={data.ticketsByStatus[TicketStatus.DELIVERED] ?? 0}
        />
      </div>

      <section>
        <h2 className="mb-3 text-base font-semibold text-gray-700">Recent Tickets</h2>
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <RecentTicketsTable tickets={data.recentTickets} />
        </div>
      </section>
    </div>
  );
}
