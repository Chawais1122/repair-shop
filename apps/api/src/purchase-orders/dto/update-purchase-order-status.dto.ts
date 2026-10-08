import { IsIn } from 'class-validator';
import { PurchaseOrderStatus } from '@repair-shop/shared';

// RECEIVED is set through POST /purchase-orders/:id/receive, which also books the stock.
export class UpdatePurchaseOrderStatusDto {
  @IsIn([PurchaseOrderStatus.ORDERED, PurchaseOrderStatus.CANCELLED])
  status!: PurchaseOrderStatus.ORDERED | PurchaseOrderStatus.CANCELLED;
}
