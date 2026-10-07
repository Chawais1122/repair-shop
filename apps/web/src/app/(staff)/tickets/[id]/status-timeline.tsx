import { TicketStatus } from '@repair-shop/shared';
import { TicketStatusBadge } from '@/components/shared/ticket-status-badge';
import type { StatusHistoryItem } from '@/types/ticket';

interface StatusTimelineProps {
  history: StatusHistoryItem[];
}

export function StatusTimeline({ history }: StatusTimelineProps) {
  if (history.length === 0) return null;

  return (
    <div>
      <h2 className="mb-3 text-base font-semibold text-gray-900">Status History</h2>
      <ol className="relative border-l border-gray-200 pl-4">
        {history.map((entry, idx) => (
          <li key={entry.id} className={`mb-4 ${idx === history.length - 1 ? '' : ''}`}>
            <span className="absolute -left-1.5 mt-1 h-3 w-3 rounded-full border border-white bg-indigo-500" />
            <div className="flex flex-wrap items-center gap-2">
              <TicketStatusBadge status={entry.toStatus as TicketStatus} />
              {entry.fromStatus && (
                <span className="text-xs text-gray-400">
                  from{' '}
                  <TicketStatusBadge status={entry.fromStatus as TicketStatus} />
                </span>
              )}
            </div>
            <div className="mt-0.5 text-xs text-gray-500">
              {entry.changedBy.name} · {new Date(entry.changedAt).toLocaleString()}
            </div>
            {entry.notes && (
              <p className="mt-1 text-sm text-gray-600">{entry.notes}</p>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
