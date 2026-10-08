import { PurchaseOrderStatus } from '@repair-shop/shared';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export const PO_STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  [PurchaseOrderStatus.DRAFT]: 'Draft',
  [PurchaseOrderStatus.ORDERED]: 'Ordered',
  [PurchaseOrderStatus.RECEIVED]: 'Received',
  [PurchaseOrderStatus.CANCELLED]: 'Cancelled',
};

const STATUS_STYLES: Record<PurchaseOrderStatus, string> = {
  [PurchaseOrderStatus.DRAFT]: 'bg-zinc-100 text-zinc-700 hover:bg-zinc-100',
  [PurchaseOrderStatus.ORDERED]: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
  [PurchaseOrderStatus.RECEIVED]: 'bg-green-100 text-green-700 hover:bg-green-100',
  [PurchaseOrderStatus.CANCELLED]: 'bg-red-100 text-red-700 hover:bg-red-100',
};

export function PurchaseOrderStatusBadge({ status }: { status: PurchaseOrderStatus }) {
  return (
    <Badge variant="secondary" className={cn('font-medium shadow-none', STATUS_STYLES[status])}>
      {PO_STATUS_LABELS[status]}
    </Badge>
  );
}
