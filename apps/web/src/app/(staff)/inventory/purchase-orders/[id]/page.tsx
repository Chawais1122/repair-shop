import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ApiError } from '@/lib/api/client';
import { getPurchaseOrder } from '@/lib/api/inventory';
import { formatCurrency, formatDate } from '@/lib/format';
import { PageBreadcrumb } from '@/components/shared/page-breadcrumb';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PurchaseOrderStatusBadge } from '../components/purchase-order-status-badge';
import { PurchaseOrderActions } from './purchase-order-actions';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PurchaseOrderDetailPage({ params }: Props) {
  const { id } = await params;

  let order;
  try {
    order = await getPurchaseOrder(id);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <PageBreadcrumb
          items={[
            { label: 'Purchase orders', href: '/inventory/purchase-orders' },
            { label: order.poNumber },
          ]}
        />
        <PageHeader
          title={
            <span className="flex flex-wrap items-center gap-3">
              {order.poNumber}
              <PurchaseOrderStatusBadge status={order.status} />
            </span>
          }
          description={`From ${order.supplier.name}`}
          className="mb-0"
          actions={<PurchaseOrderActions orderId={order.id} status={order.status} />}
        />
      </div>

      <Card>
        <CardContent className="grid gap-4 pt-6 text-sm sm:grid-cols-4">
          <div>
            <p className="text-muted-foreground">Created</p>
            <p className="font-medium">{formatDate(order.createdAt)}</p>
            <p className="text-xs text-muted-foreground">by {order.createdBy.name}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Ordered</p>
            <p className="font-medium">{formatDate(order.orderedAt)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Received</p>
            <p className="font-medium">{formatDate(order.receivedAt)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Total</p>
            <p className="text-lg font-semibold">{formatCurrency(order.total)}</p>
          </div>
          {order.notes && (
            <div className="sm:col-span-4">
              <p className="text-muted-foreground">Notes</p>
              <p className="whitespace-pre-wrap">{order.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Items</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-2">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-6">Part</TableHead>
                <TableHead className="px-6 text-right">Qty</TableHead>
                <TableHead className="px-6 text-right">Unit cost</TableHead>
                <TableHead className="px-6 text-right">Line total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="px-6">
                    <Link
                      href={`/inventory/${item.part.id}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {item.part.name}
                    </Link>
                    <p className="font-mono text-xs text-muted-foreground">{item.part.sku}</p>
                  </TableCell>
                  <TableCell className="px-6 text-right tabular-nums">{item.quantity}</TableCell>
                  <TableCell className="px-6 text-right tabular-nums">
                    {formatCurrency(item.unitCost)}
                  </TableCell>
                  <TableCell className="px-6 text-right font-medium tabular-nums">
                    {formatCurrency(item.lineTotal)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={3} className="px-6 text-right">
                  Total
                </TableCell>
                <TableCell className="px-6 text-right tabular-nums">
                  {formatCurrency(order.total)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
