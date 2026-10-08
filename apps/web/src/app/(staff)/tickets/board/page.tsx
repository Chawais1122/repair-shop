import Link from 'next/link';
import { Plus } from 'lucide-react';
import { TicketStatus } from '@repair-shop/shared';
import { getTechnicians, getTickets } from '@/lib/api/tickets';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { TicketsViewToggle } from '../components/tickets-view-toggle';
import { TicketBoard, type BoardColumns } from './ticket-board';
import { BoardFilters } from './board-filters';

interface PageProps {
  searchParams: Promise<{ assignedToId?: string; search?: string }>;
}

const BOARD_STATUSES: TicketStatus[] = [
  TicketStatus.RECEIVED,
  TicketStatus.DIAGNOSING,
  TicketStatus.WAITING_APPROVAL,
  TicketStatus.APPROVED,
  TicketStatus.REPAIRING,
  TicketStatus.READY,
  TicketStatus.DELIVERED,
  TicketStatus.CANCELLED,
];

// Closed columns grow forever, so only the most recent ones are shown on the board
const CLOSED_STATUSES = new Set([TicketStatus.DELIVERED, TicketStatus.CANCELLED]);

export default async function TicketBoardPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const search = params.search;
  // "all" is the Select sentinel for no technician filter
  const assignedToId =
    params.assignedToId && params.assignedToId !== 'all' ? params.assignedToId : undefined;

  const [technicians, ...results] = await Promise.all([
    getTechnicians(),
    ...BOARD_STATUSES.map((status) =>
      getTickets({
        status,
        assignedToId,
        search: search || undefined,
        limit: CLOSED_STATUSES.has(status) ? 15 : 100,
      }),
    ),
  ]);

  const columns = Object.fromEntries(
    BOARD_STATUSES.map((status, i) => [
      status,
      { tickets: results[i]!.data, total: results[i]!.meta.total },
    ]),
  ) as BoardColumns;

  return (
    <div>
      <PageHeader
        title="Ticket board"
        description="Drag a ticket to another column to change its status."
        actions={
          <>
            <TicketsViewToggle active="board" />
            <Button asChild>
              <Link href="/tickets/new">
                <Plus />
                New ticket
              </Link>
            </Button>
          </>
        }
      />

      <BoardFilters technicians={technicians} assignedToId={assignedToId} search={search} />

      <TicketBoard initialColumns={columns} statuses={BOARD_STATUSES} />
    </div>
  );
}
