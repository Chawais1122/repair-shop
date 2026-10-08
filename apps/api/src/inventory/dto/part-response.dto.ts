import { StockMovementReason } from '@repair-shop/shared';

export class PartResponseDto {
  id!: string;
  sku!: string;
  name!: string;
  category!: string | null;
  description!: string | null;
  costPrice!: string;
  sellPrice!: string;
  quantity!: number;
  lowStockThreshold!: number;
  isLowStock!: boolean;
  isActive!: boolean;
  supplier!: { id: string; name: string } | null;
  createdAt!: Date;
  updatedAt!: Date;
}

export class StockMovementResponseDto {
  id!: string;
  change!: number;
  reason!: StockMovementReason;
  referenceId!: string | null;
  note!: string | null;
  createdBy!: { id: string; name: string };
  createdAt!: Date;
}

export class InventorySummaryDto {
  totalParts!: number;
  lowStockCount!: number;
  outOfStockCount!: number;
  stockValueAtCost!: string;
}
