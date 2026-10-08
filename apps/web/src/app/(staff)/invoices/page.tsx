import Link from 'next/link';
import { Plus, ReceiptText, Search } from 'lucide-react';
import { InvoiceStatus } from '@repair-shop/shared';
import { getInvoices } from '@/lib/api/invoices';
import { formatCurrency, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { Pagination } from '@/components/shared/pagination';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { INVOICE_STATUS_LABELS, InvoiceStatusBadge } from './components/invoice-status-badge';

interface Props {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>;
}

const STATUS_TABS = [undefined, ...Object.values(InvoiceStatus)] as const;

export default async function InvoicesPage({ searchParams }: Props) {
  const params = await searchParams;
  const search = params.search ?? '';
  const status = Object.values(InvoiceStatus).includes(params.status as InvoiceStatus)
    ? (params.status as InvoiceStatus)
    : undefined;
  const page = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1);
  const { data: invoices, meta } = await getInvoices({
    search: search || undefined,
    status,
    page,
  });

  const href = (overrides: { status?: InvoiceStatus; page?: number }) => {
    const q = new URLSearchParams();
    if (search) q.set('search', search);
    const s = 'status' in overrides ? overrides.status : status;
    if (s) q.set('status', s);
    if (overrides.page) q.set('page', String(overrides.page));
    const qs = q.toString();
    return `/invoices${qs ? `?${qs}` : ''}`;
  };

  return (
    <div>
      <PageHeader
        title="Invoices"
        description="Every sale and repair checkout."
        actions={
          <Button asChild>
            <Link href="/pos">
              <Plus />
              New sale
            </Link>
          </Button>
        }
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <nav className="flex flex-wrap gap-1" aria-label="Filter by status">
          {STATUS_TABS.map((tab) => (
            <Link
              key={tab ?? 'all'}
              href={href({ status: tab })}
              aria-current={tab === status ? 'page' : undefined}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                tab === status
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              {tab ? INVOICE_STATUS_LABELS[tab] : 'All'}
            </Link>
          ))}
        </nav>
        <form method="GET" className="flex gap-2">
          {status && <input type="hidden" name="status" value={status} />}
          <label htmlFor="invoice-search" className="sr-only">
            Search invoices
          </label>
          <div className="relative w-full sm:w-64">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="invoice-search"
              name="search"
              defaultValue={search}
              placeholder="Invoice #, customer, ticket…"
              className="bg-background pl-8"
            />
          </div>
          <Button type="submit" variant="outline">
            Search
          </Button>
        </form>
      </div>

      {invoices.length === 0 ? (
        <EmptyState
          icon={<ReceiptText />}
          message={search || status ? 'No invoices match your filters.' : 'No invoices yet.'}
          actionLabel={search || status ? undefined : 'Make your first sale'}
          actionHref={search || status ? undefined : '/pos'}
          className="bg-background"
        />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-4">Invoice</TableHead>
                <TableHead className="px-4">Customer</TableHead>
                <TableHead className="hidden px-4 md:table-cell">Ticket</TableHead>
                <TableHead className="px-4">Status</TableHead>
                <TableHead className="px-4 text-right">Total</TableHead>
                <TableHead className="hidden px-4 sm:table-cell">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="px-4 font-medium">
                    <Link
                      href={`/invoices/${inv.id}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {inv.invoiceNumber}
                    </Link>
                  </TableCell>
                  <TableCell className="px-4">
                    {inv.customer?.name ?? (
                      <span className="text-muted-foreground">Walk-in</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden px-4 md:table-cell">
                    {inv.ticket ? (
                      <Link
                        href={`/tickets/${inv.ticket.id}`}
                        className="text-muted-foreground underline-offset-4 hover:underline"
                      >
                        {inv.ticket.ticketNumber}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="px-4">
                    <InvoiceStatusBadge status={inv.status} />
                  </TableCell>
                  <TableCell className="px-4 text-right font-medium tabular-nums">
                    {formatCurrency(inv.total)}
                  </TableCell>
                  <TableCell className="hidden px-4 text-muted-foreground sm:table-cell">
                    {formatDate(inv.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {meta.total > meta.limit && (
            <div className="border-t px-4 py-3">
              <Pagination meta={meta} buildHref={(p) => href({ page: p })} />
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
