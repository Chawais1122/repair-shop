import type { PaginatedResponse, PurchaseOrderStatus } from '@repair-shop/shared';
import type {
  InventorySummary,
  Part,
  PurchaseOrder,
  StockMovement,
  Supplier,
  TicketItemsSummary,
} from '@/types/inventory';
import { serverGet, serverGetPage } from './server';

export interface PartQueryParams {
  search?: string;
  category?: string;
  supplierId?: string;
  lowStock?: boolean;
  includeInactive?: boolean;
  page?: number;
  limit?: number;
}

export function getParts(params?: PartQueryParams): Promise<PaginatedResponse<Part>> {
  return serverGetPage<Part>('/parts', { ...params });
}

export function getPart(id: string): Promise<Part> {
  return serverGet<Part>(`/parts/${id}`);
}

export function getPartCategories(): Promise<string[]> {
  return serverGet<string[]>('/parts/categories');
}

export function getInventorySummary(): Promise<InventorySummary> {
  return serverGet<InventorySummary>('/parts/summary');
}

export function getPartMovements(
  id: string,
  params?: { page?: number; limit?: number },
): Promise<PaginatedResponse<StockMovement>> {
  return serverGetPage<StockMovement>(`/parts/${id}/movements`, params);
}

export function getSuppliers(params?: {
  search?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<Supplier>> {
  return serverGetPage<Supplier>('/suppliers', params);
}

export function getSupplier(id: string): Promise<Supplier> {
  return serverGet<Supplier>(`/suppliers/${id}`);
}

export function getPurchaseOrders(params?: {
  status?: PurchaseOrderStatus;
  supplierId?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<PurchaseOrder>> {
  return serverGetPage<PurchaseOrder>('/purchase-orders', params);
}

export function getPurchaseOrder(id: string): Promise<PurchaseOrder> {
  return serverGet<PurchaseOrder>(`/purchase-orders/${id}`);
}

export function getTicketItems(ticketId: string): Promise<TicketItemsSummary> {
  return serverGet<TicketItemsSummary>(`/tickets/${ticketId}/items`);
}
