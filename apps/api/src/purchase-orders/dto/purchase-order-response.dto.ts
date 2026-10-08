import { PurchaseOrderStatus } from '@repair-shop/shared';

export class PurchaseOrderItemResponseDto {
  id!: string;
  part!: { id: string; sku: string; name: string };
  quantity!: number;
  unitCost!: string;
  lineTotal!: string;
}

export class PurchaseOrderResponseDto {
  id!: string;
  poNumber!: string;
  status!: PurchaseOrderStatus;
  supplier!: { id: string; name: string };
  notes!: string | null;
  orderedAt!: Date | null;
  receivedAt!: Date | null;
  createdBy!: { id: string; name: string };
  items!: PurchaseOrderItemResponseDto[];
  total!: string;
  createdAt!: Date;
  updatedAt!: Date;
}
