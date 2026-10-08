import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaginatedResponse, PurchaseOrderStatus, StockMovementReason } from '@repair-shop/shared';
import { InventoryService } from '../inventory/inventory.service';
import { PrismaService } from '../prisma/prisma.service';
import { SuppliersService } from '../suppliers/suppliers.service';
import { CreatePurchaseOrderDto, PurchaseOrderItemDto } from './dto/create-purchase-order.dto';
import { FindPurchaseOrdersQueryDto } from './dto/find-purchase-orders-query.dto';
import {
  PurchaseOrderItemResponseDto,
  PurchaseOrderResponseDto,
} from './dto/purchase-order-response.dto';
import { UpdatePurchaseOrderStatusDto } from './dto/update-purchase-order-status.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';

const PO_INCLUDE = {
  supplier: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
  items: {
    include: { part: { select: { id: true, sku: true, name: true } } },
    orderBy: { createdAt: 'asc' as const },
  },
} as const;

type PurchaseOrderWithRelations = Prisma.PurchaseOrderGetPayload<{ include: typeof PO_INCLUDE }>;

const ALLOWED_STATUS_CHANGES: Record<PurchaseOrderStatus, PurchaseOrderStatus[]> = {
  [PurchaseOrderStatus.DRAFT]: [PurchaseOrderStatus.ORDERED, PurchaseOrderStatus.CANCELLED],
  [PurchaseOrderStatus.ORDERED]: [PurchaseOrderStatus.RECEIVED, PurchaseOrderStatus.CANCELLED],
  [PurchaseOrderStatus.RECEIVED]: [],
  [PurchaseOrderStatus.CANCELLED]: [],
};

@Injectable()
export class PurchaseOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly suppliersService: SuppliersService,
    private readonly inventoryService: InventoryService,
  ) {}

  async findAll(
    query: FindPurchaseOrdersQueryDto,
  ): Promise<PaginatedResponse<PurchaseOrderResponseDto>> {
    const { status, supplierId, page = 1, limit = 20 } = query;
    const where: Prisma.PurchaseOrderWhereInput = {
      ...(status && { status }),
      ...(supplierId && { supplierId }),
    };

    const [orders, total] = await this.prisma.$transaction([
      this.prisma.purchaseOrder.findMany({
        where,
        include: PO_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);

    return { data: orders.map((o) => this.toResponseDto(o)), meta: { page, limit, total } };
  }

  async findOne(id: string): Promise<PurchaseOrderResponseDto> {
    return this.toResponseDto(await this.getOrThrow(id));
  }

  async create(dto: CreatePurchaseOrderDto, userId: string): Promise<PurchaseOrderResponseDto> {
    await this.suppliersService.findOne(dto.supplierId);
    await this.assertPartsUsable(dto.items);

    const count = await this.prisma.purchaseOrder.count();
    const poNumber = `PO-${String(count + 1).padStart(4, '0')}`;

    const order = await this.prisma.purchaseOrder.create({
      data: {
        poNumber,
        supplierId: dto.supplierId,
        notes: dto.notes ?? null,
        createdById: userId,
        items: { create: dto.items.map((i) => this.toItemData(i)) },
      },
    });
    return this.findOne(order.id);
  }

  async update(id: string, dto: UpdatePurchaseOrderDto): Promise<PurchaseOrderResponseDto> {
    const order = await this.getOrThrow(id);
    if (order.status !== PurchaseOrderStatus.DRAFT) {
      throw new BadRequestException('Only draft purchase orders can be edited');
    }
    if (dto.items) await this.assertPartsUsable(dto.items);

    await this.prisma.$transaction(async (tx) => {
      if (dto.items) {
        await tx.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: id } });
        await tx.purchaseOrderItem.createMany({
          data: dto.items.map((i) => ({ ...this.toItemData(i), purchaseOrderId: id })),
        });
      }
      if (dto.notes !== undefined) {
        await tx.purchaseOrder.update({ where: { id }, data: { notes: dto.notes || null } });
      }
    });
    return this.findOne(id);
  }

  async updateStatus(
    id: string,
    dto: UpdatePurchaseOrderStatusDto,
  ): Promise<PurchaseOrderResponseDto> {
    const order = await this.getOrThrow(id);
    this.assertTransition(order.status as PurchaseOrderStatus, dto.status);

    await this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: dto.status,
        ...(dto.status === PurchaseOrderStatus.ORDERED && { orderedAt: new Date() }),
      },
    });
    return this.findOne(id);
  }

  /** Books every line into stock and marks the order received, all or nothing. */
  async receive(id: string, userId: string): Promise<PurchaseOrderResponseDto> {
    const order = await this.getOrThrow(id);
    this.assertTransition(order.status as PurchaseOrderStatus, PurchaseOrderStatus.RECEIVED);

    await this.prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        await this.inventoryService.applyStockChange(tx, {
          partId: item.partId,
          change: item.quantity,
          reason: StockMovementReason.PURCHASE_RECEIVED,
          referenceId: order.id,
          note: order.poNumber,
          userId,
        });
        await this.inventoryService.updateCostPrice(tx, item.partId, item.unitCost);
      }
      await tx.purchaseOrder.update({
        where: { id },
        data: { status: PurchaseOrderStatus.RECEIVED, receivedAt: new Date() },
      });
    });
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const order = await this.getOrThrow(id);
    if (order.status !== PurchaseOrderStatus.DRAFT) {
      throw new BadRequestException('Only draft purchase orders can be deleted');
    }
    await this.prisma.purchaseOrder.delete({ where: { id } });
  }

  private async getOrThrow(id: string): Promise<PurchaseOrderWithRelations> {
    const order = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: PO_INCLUDE,
    });
    if (!order) throw new NotFoundException(`Purchase order ${id} not found`);
    return order;
  }

  private assertTransition(from: PurchaseOrderStatus, to: PurchaseOrderStatus): void {
    if (!ALLOWED_STATUS_CHANGES[from].includes(to)) {
      throw new BadRequestException(`Cannot change purchase order from ${from} to ${to}`);
    }
  }

  private async assertPartsUsable(items: PurchaseOrderItemDto[]): Promise<void> {
    const ids = new Set(items.map((i) => i.partId));
    if (ids.size !== items.length) {
      throw new BadRequestException('Each part may only appear once per purchase order');
    }
    for (const partId of ids) {
      const part = await this.inventoryService.getPartPricing(partId);
      if (!part.isActive) throw new BadRequestException(`Part ${part.name} is inactive`);
    }
  }

  private toItemData(item: PurchaseOrderItemDto): {
    partId: string;
    quantity: number;
    unitCost: Prisma.Decimal;
  } {
    return {
      partId: item.partId,
      quantity: item.quantity,
      unitCost: new Prisma.Decimal(item.unitCost),
    };
  }

  private toResponseDto(order: PurchaseOrderWithRelations): PurchaseOrderResponseDto {
    const items: PurchaseOrderItemResponseDto[] = order.items.map((i) => ({
      id: i.id,
      part: i.part,
      quantity: i.quantity,
      unitCost: i.unitCost.toFixed(2),
      lineTotal: i.unitCost.times(i.quantity).toFixed(2),
    }));
    const total = order.items.reduce(
      (sum, i) => sum.plus(i.unitCost.times(i.quantity)),
      new Prisma.Decimal(0),
    );

    return {
      id: order.id,
      poNumber: order.poNumber,
      status: order.status as PurchaseOrderStatus,
      supplier: order.supplier,
      notes: order.notes,
      orderedAt: order.orderedAt,
      receivedAt: order.receivedAt,
      createdBy: order.createdBy,
      items,
      total: total.toFixed(2),
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }
}
