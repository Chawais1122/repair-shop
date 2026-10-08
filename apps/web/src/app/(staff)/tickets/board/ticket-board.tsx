'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { AlertCircle, Loader2 } from 'lucide-react';
import { canTransitionTicket, TicketStatus } from '@repair-shop/shared';
import { clientFetch } from '@/lib/api/client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { TICKET_STATUS_LABELS } from '@/components/shared/ticket-status-badge';
import { cn } from '@/lib/utils';
import type { Ticket } from '@/types/ticket';
import { TicketCard } from './ticket-card';

export type BoardColumns = Record<TicketStatus, { tickets: Ticket[]; total: number }>;

interface Props {
  initialColumns: BoardColumns;
  statuses: TicketStatus[];
}

const COLUMN_ACCENTS: Record<TicketStatus, string> = {
  [TicketStatus.RECEIVED]: 'bg-zinc-400',
  [TicketStatus.DIAGNOSING]: 'bg-blue-500',
  [TicketStatus.WAITING_APPROVAL]: 'bg-yellow-500',
  [TicketStatus.APPROVED]: 'bg-indigo-500',
  [TicketStatus.REPAIRING]: 'bg-purple-500',
  [TicketStatus.READY]: 'bg-green-500',
  [TicketStatus.DELIVERED]: 'bg-teal-500',
  [TicketStatus.CANCELLED]: 'bg-red-500',
};

export function TicketBoard({ initialColumns, statuses }: Props) {
  const router = useRouter();
  const [columns, setColumns] = useState(initialColumns);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Server re-renders (filters, router.refresh) supply fresh data
  useEffect(() => setColumns(initialColumns), [initialColumns]);

  const sensors = useSensors(
    // A small distance keeps clicks on the ticket link from starting a drag
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  function handleDragStart(event: DragStartEvent) {
    setError('');
    setActiveTicket((event.active.data.current?.ticket as Ticket | undefined) ?? null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveTicket(null);
    const ticket = event.active.data.current?.ticket as Ticket | undefined;
    const target = event.over?.id as TicketStatus | undefined;
    if (!ticket || !target || target === ticket.status) return;

    if (!canTransitionTicket(ticket.status, target)) {
      setError(
        `${ticket.ticketNumber} can't move from ${TICKET_STATUS_LABELS[ticket.status]} to ${TICKET_STATUS_LABELS[target]}.`,
      );
      return;
    }

    const previous = columns;
    setColumns((cols) => moveTicket(cols, ticket, target));
    setSavingId(ticket.id);

    try {
      await clientFetch(`/tickets/${ticket.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: target }),
      });
      router.refresh();
    } catch (err) {
      setColumns(previous);
      setError(err instanceof Error ? err.message : 'Failed to update ticket status');
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveTicket(null)}
      >
        <div className="-mx-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="flex min-w-max gap-4">
            {statuses.map((status) => (
              <BoardColumn
                key={status}
                status={status}
                tickets={columns[status].tickets}
                total={columns[status].total}
                savingId={savingId}
                dropState={
                  activeTicket === null || activeTicket.status === status
                    ? 'idle'
                    : canTransitionTicket(activeTicket.status, status)
                      ? 'allowed'
                      : 'blocked'
                }
              />
            ))}
          </div>
        </div>

        <DragOverlay>
          {activeTicket && <TicketCard ticket={activeTicket} overlay />}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function moveTicket(cols: BoardColumns, ticket: Ticket, target: TicketStatus): BoardColumns {
  const from = cols[ticket.status];
  const to = cols[target];
  return {
    ...cols,
    [ticket.status]: {
      tickets: from.tickets.filter((t) => t.id !== ticket.id),
      total: from.total - 1,
    },
    [target]: {
      tickets: [{ ...ticket, status: target }, ...to.tickets],
      total: to.total + 1,
    },
  };
}

interface ColumnProps {
  status: TicketStatus;
  tickets: Ticket[];
  total: number;
  savingId: string | null;
  dropState: 'idle' | 'allowed' | 'blocked';
}

function BoardColumn({ status, tickets, total, savingId, dropState }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <section
      ref={setNodeRef}
      aria-label={`${TICKET_STATUS_LABELS[status]} column`}
      className={cn(
        'flex w-72 shrink-0 flex-col rounded-xl border bg-muted/50 transition-colors',
        dropState === 'allowed' && 'border-dashed border-primary/40',
        dropState === 'allowed' && isOver && 'border-primary bg-primary/5',
        dropState === 'blocked' && 'opacity-50',
      )}
    >
      <header className="flex items-center justify-between gap-2 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className={cn('size-2 rounded-full', COLUMN_ACCENTS[status])} aria-hidden="true" />
          <h2 className="text-sm font-semibold">{TICKET_STATUS_LABELS[status]}</h2>
        </div>
        <Badge variant="secondary" className="font-medium shadow-none">
          {total}
        </Badge>
      </header>

      <div className="flex max-h-[calc(100vh-18rem)] min-h-32 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
        {tickets.length === 0 ? (
          <p className="rounded-lg border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
            No tickets
          </p>
        ) : (
          tickets.map((ticket) => (
            <DraggableTicket key={ticket.id} ticket={ticket} saving={savingId === ticket.id} />
          ))
        )}
        {total > tickets.length && (
          <p className="px-1 py-1 text-center text-xs text-muted-foreground">
            Showing {tickets.length} of {total}
          </p>
        )}
      </div>
    </section>
  );
}

function DraggableTicket({ ticket, saving }: { ticket: Ticket; saving: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: ticket.id,
    data: { ticket },
    disabled: saving,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      aria-roledescription="Draggable ticket"
      className={cn('relative touch-none', isDragging && 'opacity-40')}
    >
      <TicketCard ticket={ticket} />
      {saving && (
        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/60">
          <Loader2 className="size-4 animate-spin" aria-label="Saving" />
        </div>
      )}
    </div>
  );
}
