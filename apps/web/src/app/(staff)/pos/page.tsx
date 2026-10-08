import { TicketStatus } from '@repair-shop/shared';
import { ApiError } from '@/lib/api/client';
import { getTicket, getTickets } from '@/lib/api/tickets';
import { PageHeader } from '@/components/shared/page-header';
import type { Ticket } from '@/types/ticket';
import { PosTerminal } from './pos-terminal';

interface Props {
  searchParams: Promise<{ ticketId?: string }>;
}

function isBillable(ticket: Ticket): boolean {
  return !ticket.invoicedAt && ticket.status !== TicketStatus.CANCELLED;
}

export default async function PosPage({ searchParams }: Props) {
  const { ticketId } = await searchParams;

  const ready = await getTickets({ status: TicketStatus.READY, limit: 50 });
  const pickups = ready.data.filter(isBillable);

  // "Check out" from a ticket page may point at a ticket that isn't READY yet
  let preselected: Ticket | null = pickups.find((t) => t.id === ticketId) ?? null;
  if (ticketId && !preselected) {
    try {
      const ticket = await getTicket(ticketId);
      if (isBillable(ticket)) preselected = ticket;
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 404)) throw err;
    }
  }

  return (
    <div>
      <PageHeader
        title="Point of sale"
        description="Sell products and check out repairs."
        className="mb-4"
      />
      <PosTerminal pickups={pickups} preselectedTicket={preselected} />
    </div>
  );
}
