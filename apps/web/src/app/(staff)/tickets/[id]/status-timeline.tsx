import { TicketStatus } from '@repair-shop/shared';
import { TicketStatusBadge } from '@/components/shared/ticket-status-badge';
import { cn } from '@/lib/utils';
import type { StatusHistoryItem } from '@/types/ticket';

interface Props {
  history: StatusHistoryItem[];
}

export function StatusTimeline({ history }: Props) {
  if (history.length === 0) {
    return <p className="text-sm text-muted-foreground">No status changes recorded yet.</p>;
  }

  return (
    <ol className="space-y-0">
      {history.map((entry, idx) => (
        <li key={entry.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span
              className={cn(
                'mt-1.5 size-2.5 shrink-0 rounded-full',
                idx === 0 ? 'bg-primary ring-4 ring-primary/15' : 'bg-muted-foreground/30',
              )}
              aria-hidden="true"
            />
            {idx < history.length - 1 && (
              <span className="mt-1 w-px flex-1 bg-border" aria-hidden="true" />
            )}
          </div>
          <div className="pb-5">
            <div className="flex flex-wrap items-center gap-2">
              <TicketStatusBadge status={entry.toStatus as TicketStatus} />
              {entry.fromStatus && (
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  from <TicketStatusBadge status={entry.fromStatus as TicketStatus} />
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {entry.changedBy.name} &middot; {new Date(entry.changedAt).toLocaleString()}
            </p>
            {entry.notes && <p className="mt-1 text-sm">{entry.notes}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
