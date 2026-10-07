import { TicketStatus } from '@repair-shop/shared';
import { TicketStatusBadge } from '@/components/shared/ticket-status-badge';
import type { StatusHistoryItem } from '@/types/ticket';

interface Props {
  history: StatusHistoryItem[];
}

export function StatusTimeline({ history }: Props) {
  return (
    <div>
      <h2 className="mb-4 text-base font-semibold text-gray-900">Status History</h2>
      {history.length === 0 ? (
        <p className="text-sm text-gray-400">No status changes recorded yet.</p>
      ) : (
        <ol className="space-y-4">
          {history.map((entry, idx) => (
            <li key={entry.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                    idx === 0 ? 'bg-indigo-600' : 'bg-gray-300'
                  }`}
                  aria-hidden="true"
                />
                {idx < history.length - 1 && (
                  <span className="mt-1 w-px flex-1 bg-gray-200" aria-hidden="true" />
                )}
              </div>
              <div className="pb-4">
                <div className="flex flex-wrap items-center gap-2">
                  <TicketStatusBadge status={entry.toStatus as TicketStatus} />
                  {entry.fromStatus && (
                    <span className="text-xs text-gray-400">
                      from <TicketStatusBadge status={entry.fromStatus as TicketStatus} />
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {entry.changedBy.name} &middot;{' '}
                  {new Date(entry.changedAt).toLocaleString()}
                </p>
                {entry.notes && (
                  <p className="mt-1 text-sm text-gray-600">{entry.notes}</p>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
