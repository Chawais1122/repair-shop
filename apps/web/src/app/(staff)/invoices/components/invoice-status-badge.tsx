import { InvoiceStatus } from '@repair-shop/shared';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  [InvoiceStatus.UNPAID]: 'Unpaid',
  [InvoiceStatus.PARTIALLY_PAID]: 'Partially paid',
  [InvoiceStatus.PAID]: 'Paid',
  [InvoiceStatus.VOID]: 'Void',
};

const STYLES: Record<InvoiceStatus, string> = {
  [InvoiceStatus.UNPAID]: 'bg-red-100 text-red-700 hover:bg-red-100',
  [InvoiceStatus.PARTIALLY_PAID]: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
  [InvoiceStatus.PAID]: 'bg-green-100 text-green-700 hover:bg-green-100',
  [InvoiceStatus.VOID]: 'bg-zinc-100 text-zinc-500 line-through hover:bg-zinc-100',
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <Badge variant="secondary" className={cn('font-medium shadow-none', STYLES[status])}>
      {INVOICE_STATUS_LABELS[status]}
    </Badge>
  );
}
