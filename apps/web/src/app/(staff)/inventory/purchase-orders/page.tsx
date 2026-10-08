import Link from 'next/link';
import { ClipboardList, Plus } from 'lucide-react';
import { PurchaseOrderStatus } from '@repair-shop/shared';
import { getPurchaseOrders } from '@/lib/api/inventory';
import { formatCurrency, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { Pagination } from '@/components/shared/pagination';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  PO_STATUS_LABELS,
  PurchaseOrderStatusBadge,
} from './components/purchase-order-status-badge';

interface Props {
  searchParams: Promise<{ status?: string; page?: string }>;
}

const STATUS_TABS = [undefined, ...Object.values(PurchaseOrderStatus)] as const;

export default async function PurchaseOrdersPage({ searchParams }: Props) {
  const params = await searchParams;
  const status = Object.values(PurchaseOrderStatus).includes(params.status as PurchaseOrderStatus)
    ? (params.status as PurchaseOrderStatus)
    : undefined;
  const page = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1);
  const { data: orders, meta } = await getPurchaseOrders({ status, page });

  const buildHref = (p: number) =>
    `/inventory/purchase-orders?${new URLSearchParams({
      ...(status && { status }),
      page: String(p),
    }).toString()}`;

  return (
    <div>
      <PageHeader
        title="Purchase orders"
        description="Order parts from suppliers and receive them into stock."
        actions={
          <Button asChild>
            <Link href="/inventory/purchase-orders/new">
              <Plus />
              New purchase order
            </Link>
          </Button>
        }
      />

      <nav className="mb-5 flex flex-wrap gap-1" aria-label="Filter by status">
        {STATUS_TABS.map((tab) => {
          const active = tab === status;
          return (
            <Link
              key={tab ?? 'all'}
              href={tab ? `/inventory/purchase-orders?status=${tab}` : '/inventory/purchase-orders'}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              {tab ? PO_STATUS_LABELS[tab] : 'All'}
            </Link>
          );
        })}
      </nav>

      {orders.length === 0 ? (
        <EmptyState
          icon={<ClipboardList />}
          message={status ? 'No purchase orders with this status.' : 'No purchase orders yet.'}
          actionLabel={status ? undefined : 'Create your first purchase order'}
          actionHref={status ? undefined : '/inventory/purchase-orders/new'}
          className="bg-background"
        />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-4">PO #</TableHead>
                <TableHead className="px-4">Supplier</TableHead>
                <TableHead className="px-4">Status</TableHead>
                <TableHead className="hidden px-4 sm:table-cell">Items</TableHead>
                <TableHead className="px-4 text-right">Total</TableHead>
                <TableHead className="hidden px-4 md:table-cell">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="px-4 font-medium">
                    <Link
                      href={`/inventory/purchase-orders/${o.id}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {o.poNumber}
                    </Link>
                  </TableCell>
                  <TableCell className="px-4">{o.supplier.name}</TableCell>
                  <TableCell className="px-4">
                    <PurchaseOrderStatusBadge status={o.status} />
                  </TableCell>
                  <TableCell className="hidden px-4 text-muted-foreground sm:table-cell">
                    {o.items.reduce((n, i) => n + i.quantity, 0)} units
                  </TableCell>
                  <TableCell className="px-4 text-right font-medium">
                    {formatCurrency(o.total)}
                  </TableCell>
                  <TableCell className="hidden px-4 text-muted-foreground md:table-cell">
                    {formatDate(o.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {meta.total > meta.limit && (
            <div className="border-t px-4 py-3">
              <Pagination meta={meta} buildHref={buildHref} />
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
