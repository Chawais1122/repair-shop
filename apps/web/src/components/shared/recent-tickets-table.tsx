import Link from 'next/link';
import { TicketStatus } from '@repair-shop/shared';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { TicketStatusBadge } from './ticket-status-badge';
import { EmptyState } from './empty-state';
import type { RecentTicket } from '@/types/dashboard';

interface Props {
  tickets: RecentTicket[];
}

const PRIORITY_STYLES: Record<string, string> = {
  LOW: 'text-muted-foreground',
  NORMAL: 'text-blue-600',
  HIGH: 'text-orange-600',
  URGENT: 'text-red-600',
};

export function RecentTicketsTable({ tickets }: Props) {
  if (tickets.length === 0) {
    return (
      <EmptyState
        message="No tickets yet."
        actionLabel="Create first ticket"
        actionHref="/tickets/new"
        className="m-4"
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="px-4">Ticket #</TableHead>
          <TableHead className="px-4">Customer</TableHead>
          <TableHead className="hidden px-4 sm:table-cell">Device</TableHead>
          <TableHead className="px-4">Status</TableHead>
          <TableHead className="hidden px-4 md:table-cell">Priority</TableHead>
          <TableHead className="hidden px-4 lg:table-cell">Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tickets.map((t) => (
          <TableRow key={t.id}>
            <TableCell className="px-4 font-medium">
              <Link href={`/tickets/${t.id}`} className="underline-offset-4 hover:underline">
                {t.ticketNumber}
              </Link>
            </TableCell>
            <TableCell className="px-4">{t.customerName}</TableCell>
            <TableCell className="hidden px-4 text-muted-foreground sm:table-cell">
              {t.deviceLabel}
            </TableCell>
            <TableCell className="px-4">
              <TicketStatusBadge status={t.status as TicketStatus} />
            </TableCell>
            <TableCell
              className={cn(
                'hidden px-4 font-medium capitalize md:table-cell',
                PRIORITY_STYLES[t.priority],
              )}
            >
              {t.priority.toLowerCase()}
            </TableCell>
            <TableCell className="hidden px-4 text-muted-foreground lg:table-cell">
              {new Date(t.createdAt).toLocaleDateString()}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
