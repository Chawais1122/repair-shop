import Link from 'next/link';
import { Clock, Smartphone, UserRound } from 'lucide-react';
import { Priority } from '@repair-shop/shared';
import { cn } from '@/lib/utils';
import type { Ticket } from '@/types/ticket';

const PRIORITY_STYLES: Record<Priority, string> = {
  [Priority.LOW]: 'bg-zinc-100 text-zinc-600',
  [Priority.NORMAL]: 'bg-blue-50 text-blue-700',
  [Priority.HIGH]: 'bg-orange-50 text-orange-700',
  [Priority.URGENT]: 'bg-red-50 text-red-700',
};

interface Props {
  ticket: Ticket;
  overlay?: boolean;
}

function ageLabel(receivedAt: string): string {
  const days = Math.floor((Date.now() - new Date(receivedAt).getTime()) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return '1 day';
  return `${days} days`;
}

export function TicketCard({ ticket, overlay = false }: Props) {
  return (
    <article
      className={cn(
        'cursor-grab rounded-lg border bg-card p-3 text-sm shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing',
        overlay && 'rotate-2 cursor-grabbing shadow-lg ring-1 ring-primary/20',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/tickets/${ticket.id}`}
          className="font-semibold underline-offset-4 hover:underline"
          // Prevent the link from swallowing a drag that started on it
          draggable={false}
        >
          {ticket.ticketNumber}
        </Link>
        <span
          className={cn(
            'rounded px-1.5 py-0.5 text-[11px] font-medium capitalize',
            PRIORITY_STYLES[ticket.priority],
          )}
        >
          {ticket.priority.toLowerCase()}
        </span>
      </div>

      <p className="mt-1.5 font-medium">{ticket.customer.name}</p>

      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Smartphone className="size-3.5 shrink-0" aria-hidden="true" />
        <span className="truncate">
          {ticket.device.brand} {ticket.device.model}
        </span>
      </p>

      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{ticket.reportedProblem}</p>

      <div className="mt-3 flex items-center justify-between gap-2 border-t pt-2 text-xs text-muted-foreground">
        <span className="flex min-w-0 items-center gap-1.5">
          <UserRound className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{ticket.assignedTo?.name ?? 'Unassigned'}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1" title="Time since received">
          <Clock className="size-3.5" aria-hidden="true" />
          {ageLabel(ticket.receivedAt)}
        </span>
      </div>
    </article>
  );
}
