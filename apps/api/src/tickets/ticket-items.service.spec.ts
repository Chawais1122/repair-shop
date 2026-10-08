import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { StockMovementReason, TicketStatus } from '@repair-shop/shared';
import { InventoryService } from '../inventory/inventory.service';
import { PrismaService } from '../prisma/prisma.service';
import { TicketItemsService } from './ticket-items.service';

const now = new Date();
const createdBy = { id: 'user-1', name: 'Tech' };

const partItem = {
  id: 'item-1',
  ticketId: 'ticket-1',
  partId: 'part-1',
  description: 'iPhone 13 Screen',
  quantity: 1,
  unitPrice: new Prisma.Decimal('120'),
  unitCost: new Prisma.Decimal('40'),
  createdById: 'user-1',
  createdAt: now,
  updatedAt: now,
  part: { id: 'part-1', sku: 'SCR', name: 'iPhone 13 Screen' },
  createdBy,
};

const laborItem = {
  ...partItem,
  id: 'item-2',
  partId: null,
  description: 'Labor',
  unitPrice: new Prisma.Decimal('35'),
  unitCost: new Prisma.Decimal('0'),
  part: null,
};

describe('TicketItemsService', () => {
  let service: TicketItemsService;
  let prisma: {
    repairTicket: { findUnique: jest.Mock };
    ticketItem: { findMany: jest.Mock; findFirst: jest.Mock; create: jest.Mock; delete: jest.Mock };
    $transaction: jest.Mock;
  };
  let inventory: { getPartPricing: jest.Mock; applyStockChange: jest.Mock };

  beforeEach(async () => {
    prisma = {
      repairTicket: {
        findUnique: jest.fn().mockResolvedValue({ status: TicketStatus.REPAIRING }),
      },
      ticketItem: {
        findMany: jest.fn().mockResolvedValue([partItem, laborItem]),
        findFirst: jest.fn().mockResolvedValue(partItem),
        create: jest.fn().mockResolvedValue(partItem),
        delete: jest.fn(),
      },
      $transaction: jest
        .fn()
        .mockImplementation((fn: (tx: unknown) => Promise<unknown>) => fn(prisma)),
    };
    inventory = {
      getPartPricing: jest.fn().mockResolvedValue({
        id: 'part-1',
        name: 'iPhone 13 Screen',
        costPrice: new Prisma.Decimal('40'),
        sellPrice: new Prisma.Decimal('120'),
        isActive: true,
      }),
      applyStockChange: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketItemsService,
        { provide: PrismaService, useValue: prisma },
        { provide: InventoryService, useValue: inventory },
      ],
    }).compile();

    service = module.get(TicketItemsService);
  });

  describe('list', () => {
    it('splits totals into parts and labor and sums cost', async () => {
      const result = await service.list('ticket-1');
      expect(result).toMatchObject({
        partsTotal: '120.00',
        laborTotal: '35.00',
        total: '155.00',
        costTotal: '40.00',
      });
    });

    it('throws NotFoundException for an unknown ticket', async () => {
      prisma.repairTicket.findUnique.mockResolvedValue(null);
      await expect(service.list('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('add', () => {
    it('prices a part line from inventory and removes it from stock', async () => {
      await service.add('ticket-1', { partId: 'part-1', quantity: 1 }, 'user-1');

      expect(prisma.ticketItem.create.mock.calls[0][0].data).toMatchObject({
        partId: 'part-1',
        description: 'iPhone 13 Screen',
        unitPrice: new Prisma.Decimal('120'),
        unitCost: new Prisma.Decimal('40'),
      });
      expect(inventory.applyStockChange).toHaveBeenCalledWith(prisma, {
        partId: 'part-1',
        change: -1,
        reason: StockMovementReason.TICKET_USAGE,
        referenceId: 'item-1',
        userId: 'user-1',
      });
    });

    it('adds labor lines without touching stock', async () => {
      prisma.ticketItem.create.mockResolvedValue(laborItem);
      await service.add('ticket-1', { description: 'Labor', quantity: 1, unitPrice: 35 }, 'user-1');
      expect(inventory.applyStockChange).not.toHaveBeenCalled();
    });

    it('rejects inactive parts', async () => {
      inventory.getPartPricing.mockResolvedValue({ name: 'Old', isActive: false });
      await expect(
        service.add('ticket-1', { partId: 'part-1', quantity: 1 }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('locks items once the ticket is invoiced', async () => {
      prisma.repairTicket.findUnique.mockResolvedValue({
        status: TicketStatus.READY,
        invoicedAt: new Date(),
      });
      await expect(
        service.add('ticket-1', { description: 'Labor', quantity: 1, unitPrice: 10 }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('locks items on delivered tickets', async () => {
      prisma.repairTicket.findUnique.mockResolvedValue({ status: TicketStatus.DELIVERED });
      await expect(
        service.add('ticket-1', { description: 'Labor', quantity: 1, unitPrice: 10 }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('returns part quantity to stock', async () => {
      await service.remove('ticket-1', 'item-1', 'user-1');
      expect(prisma.ticketItem.delete).toHaveBeenCalledWith({ where: { id: 'item-1' } });
      expect(inventory.applyStockChange).toHaveBeenCalledWith(
        prisma,
        expect.objectContaining({ change: 1, reason: StockMovementReason.TICKET_RETURN }),
      );
    });

    it('throws NotFoundException when the item is not on the ticket', async () => {
      prisma.ticketItem.findFirst.mockResolvedValue(null);
      await expect(service.remove('ticket-1', 'nope', 'user-1')).rejects.toThrow(NotFoundException);
    });
  });
});
