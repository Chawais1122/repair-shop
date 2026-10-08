import { PurchaseOrderStatus, StockMovementReason } from '@repair-shop/shared';

export interface Part {
  id: string;
  sku: string;
  name: string;
  category: string | null;
  description: string | null;
  costPrice: string;
  sellPrice: string;
  quantity: number;
  lowStockThreshold: number;
  isLowStock: boolean;
  isActive: boolean;
  supplier: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  change: number;
  reason: StockMovementReason;
  referenceId: string | null;
  note: string | null;
  createdBy: { id: string; name: string };
  createdAt: string;
}

export interface InventorySummary {
  totalParts: number;
  lowStockCount: number;
  outOfStockCount: number;
  stockValueAtCost: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrderItem {
  id: string;
  part: { id: string; sku: string; name: string };
  quantity: number;
  unitCost: string;
  lineTotal: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  status: PurchaseOrderStatus;
  supplier: { id: string; name: string };
  notes: string | null;
  orderedAt: string | null;
  receivedAt: string | null;
  createdBy: { id: string; name: string };
  items: PurchaseOrderItem[];
  total: string;
  createdAt: string;
  updatedAt: string;
}

export interface TicketItem {
  id: string;
  part: { id: string; sku: string; name: string } | null;
  description: string;
  quantity: number;
  unitPrice: string;
  unitCost: string;
  lineTotal: string;
  createdBy: { id: string; name: string };
  createdAt: string;
}

export interface TicketItemsSummary {
  items: TicketItem[];
  partsTotal: string;
  laborTotal: string;
  total: string;
  costTotal: string;
}
