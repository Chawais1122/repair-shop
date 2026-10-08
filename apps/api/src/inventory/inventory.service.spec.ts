import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { StockMovementReason } from '@repair-shop/shared';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from './inventory.service';

const now = new Date();
const mockPart = {
  id: 'part-1',
  sku: 'SCR-IP13',
  name: 'iPhone 13 Screen',
  category: 'Screens',
  description: null,
  costPrice: new Prisma.Decimal('40'),
  sellPrice: new Prisma.Decimal('120'),
  quantity: 3,
  lowStockThreshold: 5,
  supplierId: null,
  isActive: true,
  createdAt: now,
  updatedAt: now,
  supplier: null,
};

describe('InventoryService', () => {
  let service: InventoryService;
  let prisma: {
    part: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      fields: { lowStockThreshold: string };
    };
    stockMovement: { create: jest.Mock; findMany: jest.Mock; count: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      part: {
        findMany: jest.fn().mockResolvedValue([mockPart]),
        findUnique: jest.fn().mockResolvedValue(mockPart),
        findFirst: jest.fn().mockResolvedValue(null),
        count: jest.fn().mockResolvedValue(1),
        create: jest.fn().mockResolvedValue(mockPart),
        update: jest.fn().mockResolvedValue(mockPart),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        fields: { lowStockThreshold: 'lowStockThreshold-ref' },
      },
      stockMovement: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      $transaction: jest.fn().mockImplementation((arg: unknown) => {
        if (Array.isArray(arg)) return Promise.all(arg as Promise<unknown>[]);
        return (arg as (tx: unknown) => Promise<unknown>)(prisma);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [InventoryService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(InventoryService);
  });

  describe('findAll', () => {
    it('returns paginated parts with money as fixed strings and a low-stock flag', async () => {
      const result = await service.findAll({ page: 1, limit: 20 });
      expect(result.meta).toEqual({ page: 1, limit: 20, total: 1 });
      expect(result.data[0]).toMatchObject({
        costPrice: '40.00',
        sellPrice: '120.00',
        isLowStock: true,
      });
    });

    it('hides inactive parts by default', async () => {
      await service.findAll({ page: 1, limit: 20 });
      expect(prisma.part.findMany.mock.calls[0][0].where).toMatchObject({ isActive: true });
    });

    it('compares quantity against the threshold column when lowStock is set', async () => {
      await service.findAll({ lowStock: true, page: 1, limit: 20 });
      expect(prisma.part.findMany.mock.calls[0][0].where).toMatchObject({
        quantity: { lte: 'lowStockThreshold-ref' },
      });
    });
  });

  describe('create', () => {
    const dto = { sku: 'BAT-1', name: 'Battery', costPrice: 10, sellPrice: 30 };

    it('throws ConflictException when the SKU already exists', async () => {
      prisma.part.findFirst.mockResolvedValue({ id: 'other' });
      await expect(service.create(dto, 'user-1')).rejects.toThrow(ConflictException);
    });

    it('records opening stock as an ADJUSTMENT movement', async () => {
      await service.create({ ...dto, initialQuantity: 10 }, 'user-1');
      expect(prisma.stockMovement.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          change: 10,
          reason: StockMovementReason.ADJUSTMENT,
          createdById: 'user-1',
        }),
      });
    });

    it('does not write a movement when there is no opening stock', async () => {
      await service.create(dto, 'user-1');
      expect(prisma.stockMovement.create).not.toHaveBeenCalled();
    });
  });

  describe('applyStockChange', () => {
    it('increments stock and writes a ledger row for positive changes', async () => {
      await service.applyStockChange(prisma as never, {
        partId: 'part-1',
        change: 5,
        reason: StockMovementReason.PURCHASE_RECEIVED,
        userId: 'user-1',
      });
      expect(prisma.part.update).toHaveBeenCalledWith({
        where: { id: 'part-1' },
        data: { quantity: { increment: 5 } },
      });
      expect(prisma.stockMovement.create).toHaveBeenCalled();
    });

    it('guards against negative stock with a conditional update', async () => {
      await service.applyStockChange(prisma as never, {
        partId: 'part-1',
        change: -2,
        reason: StockMovementReason.TICKET_USAGE,
        userId: 'user-1',
      });
      expect(prisma.part.updateMany).toHaveBeenCalledWith({
        where: { id: 'part-1', quantity: { gte: 2 } },
        data: { quantity: { increment: -2 } },
      });
    });

    it('throws BadRequestException when there is not enough stock', async () => {
      prisma.part.updateMany.mockResolvedValue({ count: 0 });
      await expect(
        service.applyStockChange(prisma as never, {
          partId: 'part-1',
          change: -10,
          reason: StockMovementReason.TICKET_USAGE,
          userId: 'user-1',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.stockMovement.create).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the part does not exist', async () => {
      prisma.part.updateMany.mockResolvedValue({ count: 0 });
      prisma.part.findUnique.mockResolvedValue(null);
      await expect(
        service.applyStockChange(prisma as never, {
          partId: 'missing',
          change: -1,
          reason: StockMovementReason.SALE,
          userId: 'user-1',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('adjustStock', () => {
    it('throws NotFoundException for an unknown part', async () => {
      prisma.part.findUnique.mockResolvedValue(null);
      await expect(
        service.adjustStock('missing', { change: 1, note: 'recount' }, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getSummary', () => {
    it('values in-stock parts at cost', async () => {
      prisma.part.count.mockResolvedValueOnce(4).mockResolvedValueOnce(2).mockResolvedValueOnce(1);
      prisma.part.findMany.mockResolvedValue([
        { quantity: 3, costPrice: new Prisma.Decimal('40') },
        { quantity: 2, costPrice: new Prisma.Decimal('5.5') },
      ]);
      const result = await service.getSummary();
      expect(result).toEqual({
        totalParts: 4,
        lowStockCount: 2,
        outOfStockCount: 1,
        stockValueAtCost: '131.00',
      });
    });
  });

  describe('deactivate', () => {
    it('soft-deletes by clearing isActive', async () => {
      await service.deactivate('part-1');
      expect(prisma.part.update).toHaveBeenCalledWith({
        where: { id: 'part-1' },
        data: { isActive: false },
      });
    });
  });
});
