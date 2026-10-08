import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { StockMovementReason, TicketStatus } from '@repair-shop/shared';
import { InventoryService } from '../inventory/inventory.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTicketItemDto } from './dto/create-ticket-item.dto';
import { TicketItemResponseDto, TicketItemsSummaryDto } from './dto/ticket-item-response.dto';

const ITEM_INCLUDE = {
  part: { select: { id: true, sku: true, name: true } },
  createdBy: { select: { id: true, name: true } },
} as const;

type TicketItemWithRelations = Prisma.TicketItemGetPayload<{ include: typeof ITEM_INCLUDE }>;

const LOCKED_STATUSES: TicketStatus[] = [TicketStatus.DELIVERED, TicketStatus.CANCELLED];

@Injectable()
export class TicketItemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
  ) {}

  async list(ticketId: string): Promise<TicketItemsSummaryDto> {
    await this.getTicketOrThrow(ticketId);
    const items = await this.prisma.ticketItem.findMany({
      where: { ticketId },
      include: ITEM_INCLUDE,
      orderBy: { createdAt: 'asc' },
    });
    return this.summarize(items);
  }

  async add(
    ticketId: string,
    dto: CreateTicketItemDto,
    userId: string,
  ): Promise<TicketItemResponseDto> {
    await this.assertEditable(ticketId);

    const item = await this.prisma.$transaction(async (tx) => {
      if (!dto.partId) {
        return tx.ticketItem.create({
          data: {
            ticketId,
            description: dto.description!,
            quantity: dto.quantity,
            unitPrice: new Prisma.Decimal(dto.unitPrice!),
            unitCost: new Prisma.Decimal(dto.unitCost ?? 0),
            createdById: userId,
          },
          include: ITEM_INCLUDE,
        });
      }

      const part = await this.inventoryService.getPartPricing(dto.partId, tx);
      if (!part.isActive) throw new BadRequestException(`Part ${part.name} is inactive`);

      const created = await tx.ticketItem.create({
        data: {
          ticketId,
          partId: part.id,
          description: dto.description ?? part.name,
          quantity: dto.quantity,
          unitPrice:
            dto.unitPrice !== undefined ? new Prisma.Decimal(dto.unitPrice) : part.sellPrice,
          unitCost: dto.unitCost !== undefined ? new Prisma.Decimal(dto.unitCost) : part.costPrice,
          createdById: userId,
        },
        include: ITEM_INCLUDE,
      });
      await this.inventoryService.applyStockChange(tx, {
        partId: part.id,
        change: -dto.quantity,
        reason: StockMovementReason.TICKET_USAGE,
        referenceId: created.id,
        userId,
      });
      return created;
    });

    return this.toResponseDto(item);
  }

  /** Removing a part line returns its quantity to stock. */
  async remove(ticketId: string, itemId: string, userId: string): Promise<void> {
    await this.assertEditable(ticketId);
    const item = await this.prisma.ticketItem.findFirst({ where: { id: itemId, ticketId } });
    if (!item) throw new NotFoundException(`Item ${itemId} not found on this ticket`);

    await this.prisma.$transaction(async (tx) => {
      await tx.ticketItem.delete({ where: { id: itemId } });
      if (item.partId) {
        await this.inventoryService.applyStockChange(tx, {
          partId: item.partId,
          change: item.quantity,
          reason: StockMovementReason.TICKET_RETURN,
          referenceId: item.id,
          userId,
        });
      }
    });
  }

  private async getTicketOrThrow(ticketId: string): Promise<{ status: string }> {
    const ticket = await this.prisma.repairTicket.findUnique({
      where: { id: ticketId },
      select: { status: true },
    });
    if (!ticket) throw new NotFoundException(`Ticket ${ticketId} not found`);
    return ticket;
  }

  private async assertEditable(ticketId: string): Promise<void> {
    const ticket = await this.getTicketOrThrow(ticketId);
    if (LOCKED_STATUSES.includes(ticket.status as TicketStatus)) {
      throw new BadRequestException(`Items cannot be changed on a ${ticket.status} ticket`);
    }
  }

  private summarize(items: TicketItemWithRelations[]): TicketItemsSummaryDto {
    const zero = new Prisma.Decimal(0);
    let partsTotal = zero;
    let laborTotal = zero;
    let costTotal = zero;
    for (const item of items) {
      const line = item.unitPrice.times(item.quantity);
      if (item.partId) partsTotal = partsTotal.plus(line);
      else laborTotal = laborTotal.plus(line);
      costTotal = costTotal.plus(item.unitCost.times(item.quantity));
    }
    return {
      items: items.map((i) => this.toResponseDto(i)),
      partsTotal: partsTotal.toFixed(2),
      laborTotal: laborTotal.toFixed(2),
      total: partsTotal.plus(laborTotal).toFixed(2),
      costTotal: costTotal.toFixed(2),
    };
  }

  private toResponseDto(item: TicketItemWithRelations): TicketItemResponseDto {
    return {
      id: item.id,
      part: item.part,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice.toFixed(2),
      unitCost: item.unitCost.toFixed(2),
      lineTotal: item.unitPrice.times(item.quantity).toFixed(2),
      createdBy: item.createdBy,
      createdAt: item.createdAt,
    };
  }
}
