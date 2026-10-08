import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Ban } from 'lucide-react';
import { InvoiceStatus, PaymentMethod, PaymentStatus, UserRole } from '@repair-shop/shared';
import { ApiError } from '@/lib/api/client';
import { getCurrentUser } from '@/lib/api/customers';
import { getInvoice } from '@/lib/api/invoices';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { PageBreadcrumb } from '@/components/shared/page-breadcrumb';
import { PageHeader } from '@/components/shared/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { InvoiceStatusBadge } from '../components/invoice-status-badge';
import { InvoiceActions } from './invoice-actions';
import { RefundPaymentButton } from './refund-payment-button';

interface Props {
  params: Promise<{ id: string }>;
}

const METHOD_LABELS: Record<PaymentMethod, string> = {
  [PaymentMethod.CASH]: 'Cash',
  [PaymentMethod.CARD]: 'Card',
  [PaymentMethod.BANK_TRANSFER]: 'Bank transfer',
};

export default async function InvoiceDetailPage({ params }: Props) {
  const { id } = await params;

  let data;
  try {
    data = await Promise.all([getInvoice(id), getCurrentUser()]);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }
  const [invoice, user] = data;
  const isAdmin = user?.role === UserRole.ADMIN;
  const isVoid = invoice.status === InvoiceStatus.VOID;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <PageBreadcrumb
          items={[{ label: 'Invoices', href: '/invoices' }, { label: invoice.invoiceNumber }]}
        />
        <PageHeader
          title={
            <span className="flex flex-wrap items-center gap-3">
              {invoice.invoiceNumber}
              <InvoiceStatusBadge status={invoice.status} />
            </span>
          }
          description={`${formatDateTime(invoice.createdAt)} · by ${invoice.createdBy.name}`}
          className="mb-0"
          actions={<InvoiceActions invoice={invoice} isAdmin={isAdmin} />}
        />
      </div>

      {isVoid && (
        <Alert>
          <Ban className="h-4 w-4" />
          <AlertTitle>This invoice was voided</AlertTitle>
          <AlertDescription>
            {formatDateTime(invoice.voidedAt)} by {invoice.voidedBy?.name ?? 'unknown'} —{' '}
            {invoice.voidReason}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Customer</CardTitle>
          </CardHeader>
          <CardContent>
            {invoice.customer ? (
              <>
                <Link
                  href={`/customers/${invoice.customer.id}`}
                  className="font-medium underline-offset-4 hover:underline"
                >
                  {invoice.customer.name}
                </Link>
                <p className="text-sm text-muted-foreground">{invoice.customer.phone}</p>
              </>
            ) : (
              <p className="text-muted-foreground">Walk-in</p>
            )}
            {invoice.ticket && (
              <p className="mt-2 text-sm">
                Repair{' '}
                <Link
                  href={`/tickets/${invoice.ticket.id}`}
                  className="font-medium underline-offset-4 hover:underline"
                >
                  {invoice.ticket.ticketNumber}
                </Link>
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatCurrency(invoice.total)}</p>
            <p className="text-sm text-muted-foreground">
              Paid {formatCurrency(invoice.amountPaid)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Balance due</CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={cn(
                'text-3xl font-bold',
                !isVoid && Number(invoice.balanceDue) > 0 && 'text-red-600',
              )}
            >
              {isVoid ? '—' : formatCurrency(Math.max(0, Number(invoice.balanceDue)))}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Items</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-2">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-6">Description</TableHead>
                <TableHead className="px-6 text-right">Qty</TableHead>
                <TableHead className="px-6 text-right">Price</TableHead>
                <TableHead className="px-6 text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="px-6">{item.description}</TableCell>
                  <TableCell className="px-6 text-right tabular-nums">{item.quantity}</TableCell>
                  <TableCell className="px-6 text-right tabular-nums">
                    {formatCurrency(item.unitPrice)}
                  </TableCell>
                  <TableCell className="px-6 text-right font-medium tabular-nums">
                    {formatCurrency(item.lineTotal)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <dl className="ml-auto mt-2 w-full max-w-xs space-y-1.5 px-6 pb-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="tabular-nums">{formatCurrency(invoice.subtotal)}</dd>
            </div>
            {Number(invoice.discount) > 0 && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Discount</dt>
                <dd className="tabular-nums">−{formatCurrency(invoice.discount)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Tax ({Number(invoice.taxRate)}%)</dt>
              <dd className="tabular-nums">{formatCurrency(invoice.taxAmount)}</dd>
            </div>
            <div className="flex justify-between border-t pt-2 text-base font-semibold">
              <dt>Total</dt>
              <dd className="tabular-nums">{formatCurrency(invoice.total)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payments</CardTitle>
        </CardHeader>
        <CardContent className={invoice.payments.length === 0 ? undefined : 'px-0 pb-2'}>
          {invoice.payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="px-6">Date</TableHead>
                  <TableHead className="px-6">Method</TableHead>
                  <TableHead className="hidden px-6 sm:table-cell">Reference</TableHead>
                  <TableHead className="px-6 text-right">Amount</TableHead>
                  <TableHead className="px-6">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.payments.map((p) => {
                  const refunded = p.status === PaymentStatus.REFUNDED;
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="px-6 text-muted-foreground">
                        {formatDate(p.paidAt ?? p.createdAt)}
                        {!p.invoiceId && (
                          <span className="ml-2 text-xs">(ticket deposit)</span>
                        )}
                      </TableCell>
                      <TableCell className="px-6">{METHOD_LABELS[p.method]}</TableCell>
                      <TableCell className="hidden px-6 text-muted-foreground sm:table-cell">
                        {p.transactionId ?? '—'}
                      </TableCell>
                      <TableCell
                        className={cn(
                          'px-6 text-right font-medium tabular-nums',
                          refunded && 'text-muted-foreground line-through',
                        )}
                      >
                        {formatCurrency(p.amount)}
                      </TableCell>
                      <TableCell className="px-6 text-right">
                        {refunded ? (
                          <span className="text-xs text-muted-foreground">Refunded</span>
                        ) : p.status === PaymentStatus.COMPLETED && isAdmin ? (
                          <RefundPaymentButton
                            invoiceId={invoice.id}
                            paymentId={p.id}
                            amount={p.amount}
                          />
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {invoice.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent className="whitespace-pre-wrap text-sm">{invoice.notes}</CardContent>
        </Card>
      )}
    </div>
  );
}
