import Link from 'next/link';
import { getTickets } from '@/lib/api/tickets';
import { TicketStatusBadge } from '@/components/shared/ticket-status-badge';
import { TicketStatus } from '@repair-shop/shared';

interface PageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    page?: string;
  }>;
}

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: TicketStatus.RECEIVED, label: 'Received' },
  { value: TicketStatus.DIAGNOSING, label: 'Diagnosing' },
  { value: TicketStatus.WAITING_APPROVAL, label: 'Waiting Approval' },
  { value: TicketStatus.APPROVED, label: 'Approved' },
  { value: TicketStatus.REPAIRING, label: 'Repairing' },
  { value: TicketStatus.READY, label: 'Ready' },
  { value: TicketStatus.DELIVERED, label: 'Delivered' },
  { value: TicketStatus.CANCELLED, label: 'Cancelled' },
];

export default async function TicketsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Number(params.page ?? 1);
  const search = params.search ?? '';
  const status = params.status as TicketStatus | undefined;

  const { data: tickets, meta } = await getTickets({
    search: search || undefined,
    status: status || undefined,
    page,
    limit: 20,
  });

  const buildQuery = (overrides: Record<string, string>) => {
    const q = new URLSearchParams();
    if (search) q.set('search', search);
    if (status) q.set('status', status);
    if (page > 1) q.set('page', String(page));
    Object.entries(overrides).forEach(([k, v]) => {
      if (v) q.set(k, v);
      else q.delete(k);
    });
    const str = q.toString();
    return str ? `?${str}` : '';
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Tickets</h1>
        <Link
          href="/tickets/new"
          className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          New ticket
        </Link>
      </div>

      <form method="GET" className="mb-5 flex flex-wrap items-center gap-2">
        <label htmlFor="ticket-search" className="sr-only">
          Search tickets
        </label>
        <input
          id="ticket-search"
          type="text"
          name="search"
          defaultValue={search}
          placeholder="Search by ticket # or customer…"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:w-64"
        />
        <label htmlFor="ticket-status" className="sr-only">
          Filter by status
        </label>
        <select
          id="ticket-status"
          name="status"
          defaultValue={status ?? ''}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-300"
        >
          Filter
        </button>
        {(search || status) && (
          <Link
            href="/tickets"
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Clear
          </Link>
        )}
      </form>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Ticket #
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Customer
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 sm:table-cell">
                  Device
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Status
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 md:table-cell">
                  Technician
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 lg:table-cell">
                  Received
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <p className="text-sm text-gray-500">
                      {search || status
                        ? 'No tickets match your filters.'
                        : 'No tickets yet.'}
                    </p>
                    {!search && !status && (
                      <Link
                        href="/tickets/new"
                        className="mt-2 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-500"
                      >
                        Create first ticket →
                      </Link>
                    )}
                  </td>
                </tr>
              ) : (
                tickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium">
                      <Link
                        href={`/tickets/${ticket.id}`}
                        className="text-indigo-600 hover:text-indigo-800"
                      >
                        {ticket.ticketNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{ticket.customer.name}</td>
                    <td className="hidden px-4 py-3 text-sm text-gray-600 sm:table-cell">
                      {ticket.device.brand} {ticket.device.model}
                    </td>
                    <td className="px-4 py-3">
                      <TicketStatusBadge status={ticket.status} />
                    </td>
                    <td className="hidden px-4 py-3 text-sm text-gray-600 md:table-cell">
                      {ticket.assignedTo?.name ?? (
                        <span className="text-gray-400">Unassigned</span>
                      )}
                    </td>
                    <td className="hidden px-4 py-3 text-sm text-gray-500 lg:table-cell">
                      {new Date(ticket.receivedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {meta.total > meta.limit && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          <span>
            Showing {(meta.page - 1) * meta.limit + 1}–
            {Math.min(meta.page * meta.limit, meta.total)} of {meta.total}
          </span>
          <div className="flex gap-2">
            {meta.page > 1 && (
              <Link
                href={`/tickets${buildQuery({ page: String(meta.page - 1) })}`}
                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Previous
              </Link>
            )}
            {meta.page * meta.limit < meta.total && (
              <Link
                href={`/tickets${buildQuery({ page: String(meta.page + 1) })}`}
                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
