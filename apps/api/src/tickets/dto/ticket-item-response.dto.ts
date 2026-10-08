export class TicketItemResponseDto {
  id!: string;
  part!: { id: string; sku: string; name: string } | null;
  description!: string;
  quantity!: number;
  unitPrice!: string;
  unitCost!: string;
  lineTotal!: string;
  createdBy!: { id: string; name: string };
  createdAt!: Date;
}

export class TicketItemsSummaryDto {
  items!: TicketItemResponseDto[];
  partsTotal!: string;
  laborTotal!: string;
  total!: string;
  costTotal!: string;
}
