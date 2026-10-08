import Link from 'next/link';
import { notFound } from 'next/navigation';
import { History, Pencil } from 'lucide-react';
import { StockMovementReason } from '@repair-shop/shared';
import { ApiError } from '@/lib/api/client';
import { getPart, getPartMovements } from '@/lib/api/inventory';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/shared/empty-state';
import { PageBreadcrumb } from '@/components/shared/page-breadcrumb';
import { PageHeader } from '@/components/shared/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StockBadge } from '../components/stock-badge';
import { AdjustStockDialog } from './adjust-stock-dialog';
import { DeactivatePartButton } from './deactivate-part-button';

interface Props {
  params: Promise<{ id: string }>;
}

const REASON_LABELS: Record<StockMovementReason, string> = {
  [StockMovementReason.PURCHASE_RECEIVED]: 'Purchase received',
  [StockMovementReason.TICKET_USAGE]: 'Used on ticket',
  [StockMovementReason.TICKET_RETURN]: 'Returned from ticket',
  [StockMovementReason.SALE]: 'Sold',
  [StockMovementReason.SALE_VOID]: 'Sale voided',
  [StockMovementReason.ADJUSTMENT]: 'Adjustment',
};

export default async function PartDetailPage({ params }: Props) {
  const { id } = await params;

  let data;
  try {
    data = await Promise.all([getPart(id), getPartMovements(id, { limit: 25 })]);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }
  const [part, movements] = data;

  const sell = Number(part.sellPrice);
  const cost = Number(part.costPrice);
  const margin = sell > 0 ? Math.round(((sell - cost) / sell) * 100) : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <PageBreadcrumb items={[{ label: 'Inventory', href: '/inventory' }, { label: part.name }]} />
        <PageHeader
          title={
            <span className="flex flex-wrap items-center gap-3">
              {part.name}
              {!part.isActive && <Badge variant="secondary">Inactive</Badge>}
            </span>
          }
          description={`SKU ${part.sku}`}
          className="mb-0"
          actions={
            <>
              {part.isActive && <AdjustStockDialog partId={part.id} partName={part.name} />}
              <Button asChild variant="outline">
                <Link href={`/inventory/${part.id}/edit`}>
                  <Pencil />
                  Edit
                </Link>
              </Button>
              {part.isActive && <DeactivatePartButton partId={part.id} partName={part.name} />}
            </>
          }
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">In stock</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-3xl font-bold tabular-nums">{part.quantity}</p>
            <StockBadge quantity={part.quantity} isLowStock={part.isLowStock} />
            <p className="text-xs text-muted-foreground">Alert at {part.lowStockThreshold}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pricing</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatCurrency(part.sellPrice)}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Cost {formatCurrency(part.costPrice)}
              {margin !== null && <> · {margin}% margin</>}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">Category: </span>
              {part.category ?? '—'}
            </p>
            <p>
              <span className="text-muted-foreground">Supplier: </span>
              {part.supplier?.name ?? '—'}
            </p>
            {part.description && <p className="pt-1 text-muted-foreground">{part.description}</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Stock history</CardTitle>
        </CardHeader>
        <CardContent className={movements.data.length === 0 ? undefined : 'px-0 pb-2'}>
          {movements.data.length === 0 ? (
            <EmptyState icon={<History />} message="No stock movements yet." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="px-6">Date</TableHead>
                  <TableHead className="px-6">Reason</TableHead>
                  <TableHead className="px-6 text-right">Change</TableHead>
                  <TableHead className="hidden px-6 md:table-cell">Note</TableHead>
                  <TableHead className="hidden px-6 sm:table-cell">By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.data.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="px-6 text-muted-foreground">
                      {formatDateTime(m.createdAt)}
                    </TableCell>
                    <TableCell className="px-6">{REASON_LABELS[m.reason]}</TableCell>
                    <TableCell
                      className={cn(
                        'px-6 text-right font-medium tabular-nums',
                        m.change > 0 ? 'text-green-600' : 'text-red-600',
                      )}
                    >
                      {m.change > 0 ? `+${m.change}` : m.change}
                    </TableCell>
                    <TableCell className="hidden px-6 text-muted-foreground md:table-cell">
                      {m.note ?? '—'}
                    </TableCell>
                    <TableCell className="hidden px-6 text-muted-foreground sm:table-cell">
                      {m.createdBy.name}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
