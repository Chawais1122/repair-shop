import Link from 'next/link';
import { ChevronLeft, ChevronRight, Plus, Search, Ticket } from 'lucide-react';
import { TicketStatus } from '@repair-shop/shared';
import { getTickets } from '@/lib/api/tickets';
import { TicketStatusBadge } from '@/components/shared/ticket-status-badge';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface PageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    page?: string;
  }>;
}

// Radix Select does not allow an empty-string item value, so "all" stands in for no filter
const ALL_STATUSES = 'all';

const STATUS_OPTIONS = [
  { value: ALL_STATUSES, label: 'All Statuses' },
  { value: TicketStatus.RECEIVED, label: 'Received' },
  { value: TicketStatus.DIAGNOSING, label: 'Diagnosing' },
  { value: TicketStatus.WAITING_APPROVAL, label: 'Waiting Approval' },
  { value: TicketStatus.APPROVED, label: 'Approved' },
  { value: TicketStatus.REPAIRING, label: 'Repairing' },
  { value: TicketStatus.READY, label: 'Ready' },
  { value: TicketStatus.DELIVERED, label: 'Delivered' },
  { value: TicketStatus.CANCELLED, label: 'Cancelled' },
];

export default async function TicketsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Number(params.page ?? 1);
  const search = params.search ?? '';
  const status =
    params.status && params.status !== ALL_STATUSES
      ? (params.status as TicketStatus)
      : undefined;

  const { data: tickets, meta } = await getTickets({
    search: search || undefined,
    status: status || undefined,
    page,
    limit: 20,
  });

  const buildQuery = (overrides: Record<string, string>) => {
    const q = new URLSearchParams();
    if (search) q.set('search', search);
    if (status) q.set('status', status);
    if (page > 1) q.set('page', String(page));
    Object.entries(overrides).forEach(([k, v]) => {
      if (v) q.set(k, v);
      else q.delete(k);
    });
    const str = q.toString();
    return str ? `?${str}` : '';
  };

  return (
    <div>
      <PageHeader
        title="Tickets"
        actions={
          <Button asChild>
            <Link href="/tickets/new">
              <Plus />
              New ticket
            </Link>
          </Button>
        }
      />

      <form method="GET" className="mb-5 flex flex-wrap items-center gap-2">
        <label htmlFor="ticket-search" className="sr-only">
          Search tickets
        </label>
        <div className="relative w-full sm:w-64">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="ticket-search"
            type="text"
            name="search"
            defaultValue={search}
            placeholder="Search by ticket # or customer…"
            className="bg-background pl-8"
          />
        </div>
        <label htmlFor="ticket-status" className="sr-only">
          Filter by status
        </label>
        <Select name="status" defaultValue={status ?? ALL_STATUSES}>
          <SelectTrigger id="ticket-status" className="w-full bg-background sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="submit" variant="outline">
          Filter
        </Button>
        {(search || status) && (
          <Button asChild variant="ghost">
            <Link href="/tickets">Clear</Link>
          </Button>
        )}
      </form>

      {tickets.length === 0 ? (
        <EmptyState
          icon={<Ticket />}
          message={search || status ? 'No tickets match your filters.' : 'No tickets yet.'}
          actionLabel={search || status ? undefined : 'Create first ticket'}
          actionHref={search || status ? undefined : '/tickets/new'}
          className="bg-background"
        />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-4">Ticket #</TableHead>
                <TableHead className="px-4">Customer</TableHead>
                <TableHead className="hidden px-4 sm:table-cell">Device</TableHead>
                <TableHead className="px-4">Status</TableHead>
                <TableHead className="hidden px-4 md:table-cell">Technician</TableHead>
                <TableHead className="hidden px-4 lg:table-cell">Received</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell className="px-4 font-medium">
                    <Link
                      href={`/tickets/${ticket.id}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {ticket.ticketNumber}
                    </Link>
                  </TableCell>
                  <TableCell className="px-4">{ticket.customer.name}</TableCell>
                  <TableCell className="hidden px-4 text-muted-foreground sm:table-cell">
                    {ticket.device.brand} {ticket.device.model}
                  </TableCell>
                  <TableCell className="px-4">
                    <TicketStatusBadge status={ticket.status} />
                  </TableCell>
                  <TableCell className="hidden px-4 md:table-cell">
                    {ticket.assignedTo?.name ?? (
                      <span className="text-muted-foreground">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden px-4 text-muted-foreground lg:table-cell">
                    {new Date(ticket.receivedAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {meta.total > meta.limit && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {(meta.page - 1) * meta.limit + 1}–
            {Math.min(meta.page * meta.limit, meta.total)} of {meta.total}
          </span>
          <div className="flex gap-2">
            {meta.page > 1 && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/tickets${buildQuery({ page: String(meta.page - 1) })}`}>
                  <ChevronLeft />
                  Previous
                </Link>
              </Button>
            )}
            {meta.page * meta.limit < meta.total && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/tickets${buildQuery({ page: String(meta.page + 1) })}`}>
                  Next
                  <ChevronRight />
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
