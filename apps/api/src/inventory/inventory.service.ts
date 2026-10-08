import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaginatedResponse, StockMovementReason } from '@repair-shop/shared';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { CreatePartDto } from './dto/create-part.dto';
import { FindPartsQueryDto } from './dto/find-parts-query.dto';
import {
  InventorySummaryDto,
  PartResponseDto,
  StockMovementResponseDto,
} from './dto/part-response.dto';
import { UpdatePartDto } from './dto/update-part.dto';

const PART_INCLUDE = { supplier: { select: { id: true, name: true } } } as const;

type PartWithSupplier = Prisma.PartGetPayload<{ include: typeof PART_INCLUDE }>;

export interface StockChange {
  partId: string;
  change: number;
  reason: StockMovementReason;
  userId: string;
  referenceId?: string;
  note?: string;
}

/** Fields other modules need to price and cost a line item. */
export interface PartPricing {
  id: string;
  sku: string;
  name: string;
  costPrice: Prisma.Decimal;
  sellPrice: Prisma.Decimal;
  isActive: boolean;
}

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: FindPartsQueryDto): Promise<PaginatedResponse<PartResponseDto>> {
    const {
      search,
      category,
      supplierId,
      lowStock,
      includeInactive = false,
      page = 1,
      limit = 20,
    } = query;

    const where: Prisma.PartWhereInput = {
      ...(!includeInactive && { isActive: true }),
      ...(category && { category }),
      ...(supplierId && { supplierId }),
      ...(lowStock && { quantity: { lte: this.prisma.part.fields.lowStockThreshold } }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
          { category: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [parts, total] = await this.prisma.$transaction([
      this.prisma.part.findMany({
        where,
        include: PART_INCLUDE,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.part.count({ where }),
    ]);

    return { data: parts.map((p) => this.toResponseDto(p)), meta: { page, limit, total } };
  }

  async findOne(id: string): Promise<PartResponseDto> {
    const part = await this.prisma.part.findUnique({ where: { id }, include: PART_INCLUDE });
    if (!part) throw new NotFoundException(`Part ${id} not found`);
    return this.toResponseDto(part);
  }

  async getCategories(): Promise<string[]> {
    const rows = await this.prisma.part.findMany({
      where: { category: { not: null }, isActive: true },
      distinct: ['category'],
      select: { category: true },
      orderBy: { category: 'asc' },
    });
    return rows.map((r) => r.category).filter((c): c is string => c !== null);
  }

  async getSummary(): Promise<InventorySummaryDto> {
    const active = { isActive: true };
    const [totalParts, lowStockCount, outOfStockCount, stockParts] = await Promise.all([
      this.prisma.part.count({ where: active }),
      this.prisma.part.count({
        where: { ...active, quantity: { lte: this.prisma.part.fields.lowStockThreshold } },
      }),
      this.prisma.part.count({ where: { ...active, quantity: { lte: 0 } } }),
      this.prisma.part.findMany({
        where: { ...active, quantity: { gt: 0 } },
        select: { quantity: true, costPrice: true },
      }),
    ]);

    const stockValue = stockParts.reduce(
      (sum, p) => sum.plus(p.costPrice.times(p.quantity)),
      new Prisma.Decimal(0),
    );

    return {
      totalParts,
      lowStockCount,
      outOfStockCount,
      stockValueAtCost: stockValue.toFixed(2),
    };
  }

  async create(dto: CreatePartDto, userId: string): Promise<PartResponseDto> {
    await this.assertSkuAvailable(dto.sku);
    const { initialQuantity = 0, ...fields } = dto;

    const part = await this.prisma.$transaction(async (tx) => {
      const created = await tx.part.create({
        data: {
          ...fields,
          costPrice: new Prisma.Decimal(dto.costPrice),
          sellPrice: new Prisma.Decimal(dto.sellPrice),
        },
      });
      if (initialQuantity > 0) {
        await this.applyStockChange(tx, {
          partId: created.id,
          change: initialQuantity,
          reason: StockMovementReason.ADJUSTMENT,
          userId,
          note: 'Opening stock',
        });
      }
      return created;
    });

    return this.findOne(part.id);
  }

  async update(id: string, dto: UpdatePartDto): Promise<PartResponseDto> {
    await this.findOne(id);
    if (dto.sku) await this.assertSkuAvailable(dto.sku, id);

    await this.prisma.part.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.costPrice !== undefined && { costPrice: new Prisma.Decimal(dto.costPrice) }),
        ...(dto.sellPrice !== undefined && { sellPrice: new Prisma.Decimal(dto.sellPrice) }),
      },
    });
    return this.findOne(id);
  }

  /** Parts are deactivated rather than deleted so stock and sales history stay intact. */
  async deactivate(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.part.update({ where: { id }, data: { isActive: false } });
  }

  async adjustStock(id: string, dto: AdjustStockDto, userId: string): Promise<PartResponseDto> {
    await this.findOne(id);
    await this.prisma.$transaction((tx) =>
      this.applyStockChange(tx, {
        partId: id,
        change: dto.change,
        reason: StockMovementReason.ADJUSTMENT,
        userId,
        note: dto.note,
      }),
    );
    return this.findOne(id);
  }

  async getMovements(
    id: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResponse<StockMovementResponseDto>> {
    await this.findOne(id);
    const { page = 1, limit = 20 } = query;
    const where = { partId: id };

    const [movements, total] = await this.prisma.$transaction([
      this.prisma.stockMovement.findMany({
        where,
        include: { createdBy: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.stockMovement.count({ where }),
    ]);

    return {
      data: movements.map((m) => ({
        id: m.id,
        change: m.change,
        reason: m.reason as StockMovementReason,
        referenceId: m.referenceId,
        note: m.note,
        createdBy: m.createdBy,
        createdAt: m.createdAt,
      })),
      meta: { page, limit, total },
    };
  }

  /** Pricing lookup for modules that sell or consume parts. Accepts a transaction client. */
  async getPartPricing(
    partId: string,
    client: Prisma.TransactionClient = this.prisma,
  ): Promise<PartPricing> {
    const part = await client.part.findUnique({
      where: { id: partId },
      select: { id: true, sku: true, name: true, costPrice: true, sellPrice: true, isActive: true },
    });
    if (!part) throw new NotFoundException(`Part ${partId} not found`);
    return part;
  }

  /**
   * The only way stock levels change. Must run inside the caller's transaction so the
   * stock update and the business record that caused it commit together.
   * Removing stock fails with BadRequestException rather than going negative.
   */
  async applyStockChange(tx: Prisma.TransactionClient, input: StockChange): Promise<void> {
    if (input.change === 0) return;

    if (input.change < 0) {
      const { count } = await tx.part.updateMany({
        where: { id: input.partId, quantity: { gte: -input.change } },
        data: { quantity: { increment: input.change } },
      });
      if (count === 0) {
        const part = await tx.part.findUnique({
          where: { id: input.partId },
          select: { name: true, quantity: true },
        });
        if (!part) throw new NotFoundException(`Part ${input.partId} not found`);
        throw new BadRequestException(
          `Insufficient stock for ${part.name}: ${part.quantity} available, ${-input.change} requested`,
        );
      }
    } else {
      await tx.part.update({
        where: { id: input.partId },
        data: { quantity: { increment: input.change } },
      });
    }

    await tx.stockMovement.create({
      data: {
        partId: input.partId,
        change: input.change,
        reason: input.reason,
        referenceId: input.referenceId ?? null,
        note: input.note ?? null,
        createdById: input.userId,
      },
    });
  }

  /** Records the latest purchase cost so profit reports reflect what parts actually cost. */
  async updateCostPrice(
    tx: Prisma.TransactionClient,
    partId: string,
    costPrice: Prisma.Decimal,
  ): Promise<void> {
    await tx.part.update({ where: { id: partId }, data: { costPrice } });
  }

  private async assertSkuAvailable(sku: string, excludeId?: string): Promise<void> {
    const existing = await this.prisma.part.findFirst({
      where: {
        sku: { equals: sku, mode: 'insensitive' },
        ...(excludeId && { NOT: { id: excludeId } }),
      },
      select: { id: true },
    });
    if (existing) throw new ConflictException(`A part with SKU ${sku} already exists`);
  }

  private toResponseDto(part: PartWithSupplier): PartResponseDto {
    return {
      id: part.id,
      sku: part.sku,
      name: part.name,
      category: part.category,
      description: part.description,
      costPrice: part.costPrice.toFixed(2),
      sellPrice: part.sellPrice.toFixed(2),
      quantity: part.quantity,
      lowStockThreshold: part.lowStockThreshold,
      isLowStock: part.quantity <= part.lowStockThreshold,
      isActive: part.isActive,
      supplier: part.supplier,
      createdAt: part.createdAt,
      updatedAt: part.updatedAt,
    };
  }
}
