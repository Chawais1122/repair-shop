import Link from 'next/link';
import { TicketStatusBadge } from './ticket-status-badge';
import type { RecentTicket } from '@/types/dashboard';
import { TicketStatus } from '@repair-shop/shared';

interface Props {
  tickets: RecentTicket[];
}

const priorityColors: Record<string, string> = {
  LOW: 'text-gray-400',
  NORMAL: 'text-blue-500',
  HIGH: 'text-orange-500',
  URGENT: 'text-red-500',
};

export function RecentTicketsTable({ tickets }: Props) {
  if (tickets.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-400">No tickets yet.</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-4 py-3 text-left font-medium text-gray-500">Ticket #</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Customer</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Device</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Priority</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {tickets.map((t) => (
            <tr key={t.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium">
                <Link href={`/tickets/${t.id}`} className="text-indigo-600 hover:text-indigo-800">
                  {t.ticketNumber}
                </Link>
              </td>
              <td className="px-4 py-3 text-gray-700">{t.customerName}</td>
              <td className="px-4 py-3 text-gray-500">{t.deviceLabel}</td>
              <td className="px-4 py-3">
                <TicketStatusBadge status={t.status as TicketStatus} />
              </td>
              <td className={`px-4 py-3 font-medium capitalize ${priorityColors[t.priority] ?? ''}`}>
                {t.priority.toLowerCase()}
              </td>
              <td className="px-4 py-3 text-gray-400">
                {new Date(t.createdAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
