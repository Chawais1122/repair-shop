import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { PurchaseOrderStatus, StockMovementReason } from '@repair-shop/shared';
import { InventoryService } from '../inventory/inventory.service';
import { PrismaService } from '../prisma/prisma.service';
import { SuppliersService } from '../suppliers/suppliers.service';
import { PurchaseOrdersService } from './purchase-orders.service';

const now = new Date();
const makeOrder = (status: PurchaseOrderStatus) => ({
  id: 'po-1',
  poNumber: 'PO-0001',
  supplierId: 'sup-1',
  status,
  notes: null,
  orderedAt: null,
  receivedAt: null,
  createdById: 'user-1',
  createdAt: now,
  updatedAt: now,
  supplier: { id: 'sup-1', name: 'MobileParts' },
  createdBy: { id: 'user-1', name: 'Admin' },
  items: [
    {
      id: 'poi-1',
      partId: 'part-1',
      quantity: 4,
      unitCost: new Prisma.Decimal('12.50'),
      part: { id: 'part-1', sku: 'BAT-1', name: 'Battery' },
    },
  ],
});

describe('PurchaseOrdersService', () => {
  let service: PurchaseOrdersService;
  let prisma: {
    purchaseOrder: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    purchaseOrderItem: { deleteMany: jest.Mock; createMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let inventory: {
    getPartPricing: jest.Mock;
    applyStockChange: jest.Mock;
    updateCostPrice: jest.Mock;
  };
  let suppliers: { findOne: jest.Mock };

  beforeEach(async () => {
    prisma = {
      purchaseOrder: {
        findMany: jest.fn(),
        findUnique: jest.fn().mockResolvedValue(makeOrder(PurchaseOrderStatus.DRAFT)),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue({ id: 'po-1' }),
        update: jest.fn(),
        delete: jest.fn(),
      },
      purchaseOrderItem: { deleteMany: jest.fn(), createMany: jest.fn() },
      $transaction: jest.fn().mockImplementation((arg: unknown) => {
        if (Array.isArray(arg)) return Promise.all(arg as Promise<unknown>[]);
        return (arg as (tx: unknown) => Promise<unknown>)(prisma);
      }),
    };
    inventory = {
      getPartPricing: jest
        .fn()
        .mockResolvedValue({ id: 'part-1', name: 'Battery', isActive: true }),
      applyStockChange: jest.fn(),
      updateCostPrice: jest.fn(),
    };
    suppliers = { findOne: jest.fn().mockResolvedValue({ id: 'sup-1' }) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PurchaseOrdersService,
        { provide: PrismaService, useValue: prisma },
        { provide: InventoryService, useValue: inventory },
        { provide: SuppliersService, useValue: suppliers },
      ],
    }).compile();

    service = module.get(PurchaseOrdersService);
  });

  describe('create', () => {
    it('numbers the order and computes totals', async () => {
      const result = await service.create(
        { supplierId: 'sup-1', items: [{ partId: 'part-1', quantity: 4, unitCost: 12.5 }] },
        'user-1',
      );
      expect(prisma.purchaseOrder.create.mock.calls[0][0].data.poNumber).toBe('PO-0001');
      expect(result.total).toBe('50.00');
      expect(result.items[0]!.lineTotal).toBe('50.00');
    });

    it('rejects duplicate parts on one order', async () => {
      await expect(
        service.create(
          {
            supplierId: 'sup-1',
            items: [
              { partId: 'part-1', quantity: 1, unitCost: 1 },
              { partId: 'part-1', quantity: 2, unitCost: 1 },
            ],
          },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects inactive parts', async () => {
      inventory.getPartPricing.mockResolvedValue({ id: 'part-1', name: 'Old', isActive: false });
      await expect(
        service.create(
          { supplierId: 'sup-1', items: [{ partId: 'part-1', quantity: 1, unitCost: 1 }] },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('receive', () => {
    it('books stock and updates cost for each line on an ORDERED purchase order', async () => {
      prisma.purchaseOrder.findUnique.mockResolvedValue(makeOrder(PurchaseOrderStatus.ORDERED));

      await service.receive('po-1', 'user-1');

      expect(inventory.applyStockChange).toHaveBeenCalledWith(prisma, {
        partId: 'part-1',
        change: 4,
        reason: StockMovementReason.PURCHASE_RECEIVED,
        referenceId: 'po-1',
        note: 'PO-0001',
        userId: 'user-1',
      });
      expect(inventory.updateCostPrice).toHaveBeenCalledWith(
        prisma,
        'part-1',
        new Prisma.Decimal('12.50'),
      );
      expect(prisma.purchaseOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: PurchaseOrderStatus.RECEIVED }),
        }),
      );
    });

    it('refuses to receive a DRAFT order', async () => {
      await expect(service.receive('po-1', 'user-1')).rejects.toThrow(BadRequestException);
      expect(inventory.applyStockChange).not.toHaveBeenCalled();
    });

    it('refuses to receive an order twice', async () => {
      prisma.purchaseOrder.findUnique.mockResolvedValue(makeOrder(PurchaseOrderStatus.RECEIVED));
      await expect(service.receive('po-1', 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException for unknown orders', async () => {
      prisma.purchaseOrder.findUnique.mockResolvedValue(null);
      await expect(service.receive('missing', 'user-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('replaces line items on a draft', async () => {
      await service.update('po-1', { items: [{ partId: 'part-1', quantity: 9, unitCost: 3 }] });
      expect(prisma.purchaseOrderItem.deleteMany).toHaveBeenCalledWith({
        where: { purchaseOrderId: 'po-1' },
      });
      expect(prisma.purchaseOrderItem.createMany).toHaveBeenCalled();
    });

    it('rejects edits once ordered', async () => {
      prisma.purchaseOrder.findUnique.mockResolvedValue(makeOrder(PurchaseOrderStatus.ORDERED));
      await expect(service.update('po-1', { notes: 'x' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateStatus', () => {
    it('stamps orderedAt when marking ORDERED', async () => {
      await service.updateStatus('po-1', { status: PurchaseOrderStatus.ORDERED });
      expect(prisma.purchaseOrder.update).toHaveBeenCalledWith({
        where: { id: 'po-1' },
        data: { status: PurchaseOrderStatus.ORDERED, orderedAt: expect.any(Date) },
      });
    });

    it('blocks reopening a cancelled order', async () => {
      prisma.purchaseOrder.findUnique.mockResolvedValue(makeOrder(PurchaseOrderStatus.CANCELLED));
      await expect(
        service.updateStatus('po-1', { status: PurchaseOrderStatus.ORDERED }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('only deletes drafts', async () => {
      prisma.purchaseOrder.findUnique.mockResolvedValue(makeOrder(PurchaseOrderStatus.ORDERED));
      await expect(service.remove('po-1')).rejects.toThrow(BadRequestException);
    });
  });
});
