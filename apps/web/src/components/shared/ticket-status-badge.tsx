import { TicketStatus } from '@repair-shop/shared';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  [TicketStatus.RECEIVED]: 'Received',
  [TicketStatus.DIAGNOSING]: 'Diagnosing',
  [TicketStatus.WAITING_APPROVAL]: 'Waiting Approval',
  [TicketStatus.APPROVED]: 'Approved',
  [TicketStatus.REPAIRING]: 'Repairing',
  [TicketStatus.READY]: 'Ready',
  [TicketStatus.DELIVERED]: 'Delivered',
  [TicketStatus.CANCELLED]: 'Cancelled',
};

const STATUS_COLORS: Record<TicketStatus, string> = {
  [TicketStatus.RECEIVED]: 'bg-zinc-100 text-zinc-700 hover:bg-zinc-100',
  [TicketStatus.DIAGNOSING]: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
  [TicketStatus.WAITING_APPROVAL]: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
  [TicketStatus.APPROVED]: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-100',
  [TicketStatus.REPAIRING]: 'bg-purple-100 text-purple-700 hover:bg-purple-100',
  [TicketStatus.READY]: 'bg-green-100 text-green-700 hover:bg-green-100',
  [TicketStatus.DELIVERED]: 'bg-teal-100 text-teal-700 hover:bg-teal-100',
  [TicketStatus.CANCELLED]: 'bg-red-100 text-red-700 hover:bg-red-100',
};

interface TicketStatusBadgeProps {
  status: TicketStatus;
}

export function TicketStatusBadge({ status }: TicketStatusBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className={cn('whitespace-nowrap font-medium shadow-none', STATUS_COLORS[status])}
    >
      {TICKET_STATUS_LABELS[status]}
    </Badge>
  );
}
