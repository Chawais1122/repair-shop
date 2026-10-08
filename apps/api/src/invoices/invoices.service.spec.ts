import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import {
  InvoiceStatus,
  PaymentMethod,
  StockMovementReason,
  TicketStatus,
} from '@repair-shop/shared';
import { CustomersService } from '../customers/customers.service';
import { InventoryService } from '../inventory/inventory.service';
import { PaymentsService } from '../payments/payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { TicketItemsService } from '../tickets/ticket-items.service';
import { TicketsService } from '../tickets/tickets.service';
import { InvoicesService } from './invoices.service';

const D = (v: string | number) => new Prisma.Decimal(v);
const now = new Date();

const invoiceRow = {
  id: 'inv-1',
  invoiceNumber: 'INV-00001',
  customerId: 'cust-1',
  ticketId: null as string | null,
  status: InvoiceStatus.UNPAID,
  subtotal: D(100),
  discount: D(0),
  taxRate: D(0),
  taxAmount: D(0),
  total: D(100),
  notes: null,
  createdById: 'user-1',
  voidedAt: null,
  voidedById: null,
  voidReason: null,
  createdAt: now,
  updatedAt: now,
  customer: { id: 'cust-1', name: 'Jane', phone: '+1555' },
  ticket: null,
  createdBy: { id: 'user-1', name: 'Staff' },
  voidedBy: null,
  items: [],
};

const ticket = {
  id: 'ticket-1',
  ticketNumber: 'TKT-0001',
  status: TicketStatus.READY,
  invoicedAt: null,
  finalCost: null,
  estimatedCost: '80.00',
  customer: { id: 'cust-1', name: 'Jane', phone: '+1555' },
};

describe('InvoicesService', () => {
  let service: InvoicesService;
  let prisma: {
    invoice: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    invoiceItem: { findMany: jest.Mock };
    $queryRaw: jest.Mock;
    $transaction: jest.Mock;
  };
  let tickets: { findOne: jest.Mock; markInvoiced: jest.Mock; clearInvoiced: jest.Mock };
  let ticketItems: { getBillableItems: jest.Mock };
  let inventory: { getPartPricing: jest.Mock; applyStockChange: jest.Mock };
  let payments: {
    listForInvoice: jest.Mock;
    sumCompletedForInvoice: jest.Mock;
    recordInvoicePayment: jest.Mock;
    findInInvoiceScope: jest.Mock;
    markRefunded: jest.Mock;
  };
  let customers: { findOne: jest.Mock };

  beforeEach(async () => {
    prisma = {
      invoice: {
        findMany: jest.fn().mockResolvedValue([invoiceRow]),
        findUnique: jest.fn().mockResolvedValue(invoiceRow),
        findFirst: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue({ id: 'inv-1' }),
        update: jest.fn(),
      },
      invoiceItem: { findMany: jest.fn().mockResolvedValue([]) },
      $queryRaw: jest.fn(),
      $transaction: jest.fn().mockImplementation((arg: unknown) => {
        if (Array.isArray(arg)) return Promise.all(arg as Promise<unknown>[]);
        return (arg as (tx: unknown) => Promise<unknown>)(prisma);
      }),
    };
    tickets = {
      findOne: jest.fn().mockResolvedValue(ticket),
      markInvoiced: jest.fn(),
      clearInvoiced: jest.fn(),
    };
    ticketItems = { getBillableItems: jest.fn().mockResolvedValue([]) };
    inventory = {
      getPartPricing: jest.fn().mockResolvedValue({
        id: 'part-1',
        name: 'USB-C Cable',
        costPrice: D(2),
        sellPrice: D(15),
        isActive: true,
      }),
      applyStockChange: jest.fn(),
    };
    payments = {
      listForInvoice: jest.fn().mockResolvedValue([]),
      sumCompletedForInvoice: jest.fn().mockResolvedValue(D(0)),
      recordInvoicePayment: jest.fn(),
      findInInvoiceScope: jest.fn(),
      markRefunded: jest.fn(),
    };
    customers = { findOne: jest.fn().mockResolvedValue({ id: 'cust-1' }) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicesService,
        { provide: PrismaService, useValue: prisma },
        { provide: TicketsService, useValue: tickets },
        { provide: TicketItemsService, useValue: ticketItems },
        { provide: InventoryService, useValue: inventory },
        { provide: PaymentsService, useValue: payments },
        { provide: CustomersService, useValue: customers },
      ],
    }).compile();

    service = module.get(InvoicesService);
  });

  describe('computeTotals', () => {
    it('applies discount before tax and rounds tax to cents', () => {
      const t = service.computeTotals(
        [
          { quantity: 2, unitPrice: D('19.99') },
          { quantity: 1, unitPrice: D('10.00') },
        ],
        5,
        8.25,
      );
      // subtotal 49.98, taxable 44.98, tax 3.71085 -> 3.71
      expect(t.subtotal.toFixed(2)).toBe('49.98');
      expect(t.taxAmount.toFixed(2)).toBe('3.71');
      expect(t.total.toFixed(2)).toBe('48.69');
    });

    it('rejects a discount larger than the subtotal', () => {
      expect(() => service.computeTotals([{ quantity: 1, unitPrice: D(10) }], 11, 0)).toThrow(
        BadRequestException,
      );
    });
  });

  describe('create', () => {
    it('requires at least one item or a ticket', async () => {
      await expect(service.create({ items: [] }, 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('sells retail parts at their price and takes them out of stock', async () => {
      await service.create({ items: [{ partId: 'part-1', quantity: 2 }] }, 'user-1');

      const data = prisma.invoice.create.mock.calls[0][0].data;
      expect(data.invoiceNumber).toBe('INV-00001');
      expect(data.total.toFixed(2)).toBe('30.00');
      expect(data.items.create[0]).toMatchObject({
        partId: 'part-1',
        fromTicket: false,
        unitCost: D(2),
      });
      expect(inventory.applyStockChange).toHaveBeenCalledWith(
        prisma,
        expect.objectContaining({ change: -2, reason: StockMovementReason.SALE }),
      );
    });

    it('bills a ticket from its parts & labor without touching stock again', async () => {
      ticketItems.getBillableItems.mockResolvedValue([
        {
          partId: 'part-9',
          description: 'Screen',
          quantity: 1,
          unitPrice: D(150),
          unitCost: D(50),
        },
        { partId: null, description: 'Labor', quantity: 1, unitPrice: D(40), unitCost: D(0) },
      ]);

      await service.create({ ticketId: 'ticket-1' }, 'user-1');

      const data = prisma.invoice.create.mock.calls[0][0].data;
      expect(data.customerId).toBe('cust-1');
      expect(data.total.toFixed(2)).toBe('190.00');
      expect(data.items.create.every((l: { fromTicket: boolean }) => l.fromTicket)).toBe(true);
      expect(inventory.applyStockChange).not.toHaveBeenCalled();
      expect(tickets.markInvoiced).toHaveBeenCalledWith(prisma, 'ticket-1', D(190));
    });

    it('falls back to the ticket cost when it has no items', async () => {
      await service.create({ ticketId: 'ticket-1' }, 'user-1');
      const line = prisma.invoice.create.mock.calls[0][0].data.items.create[0];
      expect(line).toMatchObject({ description: 'Repair service — TKT-0001', quantity: 1 });
      expect(line.unitPrice.toFixed(2)).toBe('80.00');
    });

    it('counts earlier ticket deposits toward the new invoice', async () => {
      payments.sumCompletedForInvoice.mockResolvedValue(D(30));
      await service.create({ ticketId: 'ticket-1' }, 'user-1');
      expect(prisma.invoice.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: { status: InvoiceStatus.PARTIALLY_PAID },
      });
    });

    it('rejects a ticket that is already invoiced', async () => {
      tickets.findOne.mockResolvedValue({ ...ticket, invoicedAt: now });
      await expect(service.create({ ticketId: 'ticket-1' }, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects a customer that does not own the ticket', async () => {
      await expect(
        service.create({ ticketId: 'ticket-1', customerId: 'someone-else' }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a ticket with neither items nor a cost', async () => {
      tickets.findOne.mockResolvedValue({ ...ticket, estimatedCost: null });
      await expect(service.create({ ticketId: 'ticket-1' }, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('recordPayment', () => {
    it('records a payment and marks the invoice paid when the balance is cleared', async () => {
      payments.sumCompletedForInvoice.mockResolvedValueOnce(D(0)).mockResolvedValueOnce(D(100));

      await service.recordPayment('inv-1', { amount: 100, method: PaymentMethod.CASH });

      expect(prisma.$queryRaw).toHaveBeenCalled();
      expect(payments.recordInvoicePayment).toHaveBeenCalledWith(
        prisma,
        expect.objectContaining({ invoiceId: 'inv-1', amount: D(100) }),
      );
      expect(prisma.invoice.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: { status: InvoiceStatus.PAID },
      });
    });

    it('rejects overpayment', async () => {
      payments.sumCompletedForInvoice.mockResolvedValue(D(60));
      await expect(
        service.recordPayment('inv-1', { amount: 50, method: PaymentMethod.CARD }),
      ).rejects.toThrow(BadRequestException);
      expect(payments.recordInvoicePayment).not.toHaveBeenCalled();
    });

    it('rejects payments on void invoices', async () => {
      prisma.invoice.findUnique.mockResolvedValue({ ...invoiceRow, status: InvoiceStatus.VOID });
      await expect(
        service.recordPayment('inv-1', { amount: 1, method: PaymentMethod.CASH }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException for unknown invoices', async () => {
      prisma.invoice.findUnique.mockResolvedValue(null);
      await expect(
        service.recordPayment('nope', { amount: 1, method: PaymentMethod.CASH }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('void', () => {
    it('restores retail stock and unlocks the ticket', async () => {
      prisma.invoice.findUnique.mockResolvedValue({ ...invoiceRow, ticketId: 'ticket-1' });
      prisma.invoiceItem.findMany.mockResolvedValue([{ partId: 'part-1', quantity: 3 }]);

      await service.void('inv-1', { reason: 'Customer changed mind' }, 'admin-1');

      expect(inventory.applyStockChange).toHaveBeenCalledWith(
        prisma,
        expect.objectContaining({ change: 3, reason: StockMovementReason.SALE_VOID }),
      );
      expect(prisma.invoice.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: expect.objectContaining({ status: InvoiceStatus.VOID, voidedById: 'admin-1' }),
      });
      expect(tickets.clearInvoiced).toHaveBeenCalledWith(prisma, 'ticket-1');
    });

    it('refuses to void while invoice payments are still on it', async () => {
      payments.sumCompletedForInvoice.mockResolvedValue(D(10));
      await expect(service.void('inv-1', { reason: 'x' }, 'admin-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('refuses to void twice', async () => {
      prisma.invoice.findUnique.mockResolvedValue({ ...invoiceRow, status: InvoiceStatus.VOID });
      await expect(service.void('inv-1', { reason: 'x' }, 'admin-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findOne', () => {
    it('reports amount paid and balance due', async () => {
      payments.sumCompletedForInvoice.mockResolvedValue(D('25.5'));
      const result = await service.findOne('inv-1');
      expect(result.amountPaid).toBe('25.50');
      expect(result.balanceDue).toBe('74.50');
    });
  });

  describe('findActiveForTicket', () => {
    it('throws NotFoundException when the ticket has no active invoice', async () => {
      prisma.invoice.findFirst.mockResolvedValue(null);
      await expect(service.findActiveForTicket('ticket-1')).rejects.toThrow(NotFoundException);
    });
  });
});
