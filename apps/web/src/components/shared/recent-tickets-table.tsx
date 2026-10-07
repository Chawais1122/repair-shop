import Link from 'next/link';
import { TicketStatusBadge } from './ticket-status-badge';
import type { RecentTicket } from '@/types/dashboard';
import { TicketStatus } from '@repair-shop/shared';

interface Props {
  tickets: RecentTicket[];
}

const PRIORITY_STYLES: Record<string, string> = {
  LOW: 'text-gray-400',
  NORMAL: 'text-blue-600',
  HIGH: 'text-orange-600',
  URGENT: 'text-red-600',
};

export function RecentTicketsTable({ tickets }: Props) {
  if (tickets.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-gray-400">No tickets yet.</p>
        <Link
          href="/tickets/new"
          className="mt-2 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-500"
        >
          Create first ticket →
        </Link>
      </div>
    );
  }

  return (
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
              Priority
            </th>
            <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 lg:table-cell">
              Date
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {tickets.map((t) => (
            <tr key={t.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm font-medium">
                <Link
                  href={`/tickets/${t.id}`}
                  className="text-indigo-600 hover:text-indigo-800"
                >
                  {t.ticketNumber}
                </Link>
              </td>
              <td className="px-4 py-3 text-sm text-gray-900">{t.customerName}</td>
              <td className="hidden px-4 py-3 text-sm text-gray-500 sm:table-cell">
                {t.deviceLabel}
              </td>
              <td className="px-4 py-3">
                <TicketStatusBadge status={t.status as TicketStatus} />
              </td>
              <td className={`hidden px-4 py-3 text-sm font-medium capitalize md:table-cell ${PRIORITY_STYLES[t.priority] ?? ''}`}>
                {t.priority.toLowerCase()}
              </td>
              <td className="hidden px-4 py-3 text-sm text-gray-400 lg:table-cell">
                {new Date(t.createdAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
