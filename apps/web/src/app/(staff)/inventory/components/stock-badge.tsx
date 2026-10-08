import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Props {
  quantity: number;
  isLowStock: boolean;
}

export function StockBadge({ quantity, isLowStock }: Props) {
  const tone =
    quantity <= 0
      ? 'bg-red-100 text-red-700 hover:bg-red-100'
      : isLowStock
        ? 'bg-orange-100 text-orange-700 hover:bg-orange-100'
        : 'bg-green-100 text-green-700 hover:bg-green-100';
  const label = quantity <= 0 ? 'Out of stock' : isLowStock ? 'Low' : 'In stock';

  return (
    <Badge variant="secondary" className={cn('gap-1 font-medium shadow-none', tone)}>
      <span className="tabular-nums">{quantity}</span>
      <span className="font-normal opacity-80">· {label}</span>
    </Badge>
  );
}
