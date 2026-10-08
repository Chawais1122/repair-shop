import { ClipboardCheck, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Ticket } from '@/types/ticket';

interface Props {
  tickets: Ticket[];
  selectedId: string | null;
  loadingId: string | null;
  onSelect: (ticket: Ticket) => void;
}

export function PickupList({ tickets, selectedId, loadingId, onSelect }: Props) {
  if (tickets.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-8 text-center">
        <ClipboardCheck className="size-6 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">No repairs are waiting for pickup.</p>
      </div>
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {tickets.map((t) => {
        const selected = t.id === selectedId;
        return (
          <li key={t.id}>
            <button
              type="button"
              disabled={loadingId !== null}
              onClick={() => onSelect(t)}
              aria-pressed={selected}
              className={cn(
                'w-full rounded-lg border bg-card p-3 text-left shadow-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-wait',
                selected && 'border-primary ring-1 ring-primary',
              )}
            >
              <span className="flex items-center justify-between">
                <span className="font-semibold">{t.ticketNumber}</span>
                {loadingId === t.id && (
                  <span className="text-xs text-muted-foreground">Loading…</span>
                )}
              </span>
              <span className="mt-1 block text-sm">{t.customer.name}</span>
              <span className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Smartphone className="size-3.5" aria-hidden="true" />
                {t.device.brand} {t.device.model}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
