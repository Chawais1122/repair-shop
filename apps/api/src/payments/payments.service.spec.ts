import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { PaymentMethod, PaymentStatus } from '@repair-shop/shared';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from './payments.service';

const now = new Date();

function makePayment(
  overrides: Partial<{
    id: string;
    amount: Prisma.Decimal;
    status: PaymentStatus;
    method: PaymentMethod;
  }> = {},
) {
  return {
    id: overrides.id ?? 'pay-1',
    ticketId: 'ticket-1',
    amount: overrides.amount ?? new Prisma.Decimal('50.00'),
    method: overrides.method ?? PaymentMethod.CASH,
    status: overrides.status ?? PaymentStatus.COMPLETED,
    transactionId: null,
    paidAt: now,
    notes: null,
    createdAt: now,
    updatedAt: now,
  };
}

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prisma: {
    repairTicket: { findUnique: jest.Mock };
    payment: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      repairTicket: { findUnique: jest.fn() },
      payment: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [PaymentsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(PaymentsService);
  });

  // ─── getSummary ───────────────────────────────────────────────────────────

  describe('getSummary', () => {
    it('unpaid — returns zero paidAmount and full remaining', async () => {
      prisma.repairTicket.findUnique.mockResolvedValue({
        finalCost: new Prisma.Decimal('100.00'),
        estimatedCost: null,
      });
      prisma.payment.findMany.mockResolvedValue([]);

      const result = await service.getSummary('ticket-1');

      expect(result.totalCost).toBe('100');
      expect(result.paidAmount).toBe('0');
      expect(result.remainingAmount).toBe('100');
      expect(result.isFullyPaid).toBe(false);
    });

    it('partial payment — reflects correct remaining', async () => {
      prisma.repairTicket.findUnique.mockResolvedValue({
        finalCost: new Prisma.Decimal('100.00'),
        estimatedCost: null,
      });
      prisma.payment.findMany.mockResolvedValue([
        makePayment({ amount: new Prisma.Decimal('50.00'), status: PaymentStatus.COMPLETED }),
      ]);

      const result = await service.getSummary('ticket-1');

      expect(result.paidAmount).toBe('50');
      expect(result.remainingAmount).toBe('50');
      expect(result.isFullyPaid).toBe(false);
    });

    it('full payment — isFullyPaid is true', async () => {
      prisma.repairTicket.findUnique.mockResolvedValue({
        finalCost: new Prisma.Decimal('100.00'),
        estimatedCost: null,
      });
      prisma.payment.findMany.mockResolvedValue([
        makePayment({ amount: new Prisma.Decimal('100.00'), status: PaymentStatus.COMPLETED }),
      ]);

      const result = await service.getSummary('ticket-1');

      expect(result.paidAmount).toBe('100');
      expect(result.isFullyPaid).toBe(true);
    });

    it('no cost set — totalCost and remainingAmount are null', async () => {
      prisma.repairTicket.findUnique.mockResolvedValue({
        finalCost: null,
        estimatedCost: null,
      });
      prisma.payment.findMany.mockResolvedValue([]);

      const result = await service.getSummary('ticket-1');

      expect(result.totalCost).toBeNull();
      expect(result.remainingAmount).toBeNull();
      expect(result.isFullyPaid).toBe(false);
    });

    it('PENDING payments are not counted in paidAmount', async () => {
      prisma.repairTicket.findUnique.mockResolvedValue({
        finalCost: new Prisma.Decimal('100.00'),
        estimatedCost: null,
      });
      prisma.payment.findMany.mockResolvedValue([
        makePayment({
          id: 'p1',
          amount: new Prisma.Decimal('50.00'),
          status: PaymentStatus.PENDING,
        }),
        makePayment({
          id: 'p2',
          amount: new Prisma.Decimal('30.00'),
          status: PaymentStatus.COMPLETED,
        }),
      ]);

      const result = await service.getSummary('ticket-1');

      expect(result.paidAmount).toBe('30');
    });

    it('throws NotFoundException when ticket not found', async () => {
      prisma.repairTicket.findUnique.mockResolvedValue(null);

      await expect(service.getSummary('missing')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── create ───────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates COMPLETED payment and sets paidAt', async () => {
      prisma.repairTicket.findUnique.mockResolvedValue({
        id: 'ticket-1',
        finalCost: new Prisma.Decimal('100.00'),
        estimatedCost: null,
      });
      prisma.payment.findMany.mockResolvedValue([]);
      const created = makePayment({ status: PaymentStatus.COMPLETED });
      prisma.payment.create.mockResolvedValue(created);

      const result = await service.create('ticket-1', {
        amount: 50,
        method: PaymentMethod.CASH,
        status: PaymentStatus.COMPLETED,
      });

      expect(result.paidAt).not.toBeNull();
      expect(prisma.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ paidAt: expect.any(Date) }),
        }),
      );
    });

    it('creates PENDING payment with null paidAt', async () => {
      prisma.repairTicket.findUnique.mockResolvedValue({
        id: 'ticket-1',
        finalCost: null,
        estimatedCost: null,
      });
      const created = makePayment({ status: PaymentStatus.PENDING });
      created.paidAt = null as unknown as Date;
      prisma.payment.create.mockResolvedValue(created);

      await service.create('ticket-1', {
        amount: 50,
        method: PaymentMethod.CASH,
        status: PaymentStatus.PENDING,
      });

      expect(prisma.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ paidAt: null }),
        }),
      );
    });

    it('throws BadRequestException when amount exceeds remaining balance', async () => {
      prisma.repairTicket.findUnique.mockResolvedValue({
        id: 'ticket-1',
        finalCost: new Prisma.Decimal('50.00'),
        estimatedCost: null,
      });
      prisma.payment.findMany.mockResolvedValue([
        makePayment({ amount: new Prisma.Decimal('30.00'), status: PaymentStatus.COMPLETED }),
      ]);

      await expect(
        service.create('ticket-1', {
          amount: 30,
          method: PaymentMethod.CASH,
          status: PaymentStatus.COMPLETED,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('allows any amount when no cost is set on the ticket', async () => {
      prisma.repairTicket.findUnique.mockResolvedValue({
        id: 'ticket-1',
        finalCost: null,
        estimatedCost: null,
      });
      const created = makePayment();
      prisma.payment.create.mockResolvedValue(created);

      await expect(
        service.create('ticket-1', { amount: 999, method: PaymentMethod.CASH }),
      ).resolves.toBeDefined();
    });

    it('throws NotFoundException when ticket not found', async () => {
      prisma.repairTicket.findUnique.mockResolvedValue(null);

      await expect(
        service.create('missing', { amount: 10, method: PaymentMethod.CASH }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── update ───────────────────────────────────────────────────────────────

  describe('update', () => {
    it('sets paidAt when transitioning to COMPLETED', async () => {
      const pending = makePayment({ status: PaymentStatus.PENDING });
      pending.paidAt = null as unknown as Date;
      prisma.payment.findUnique.mockResolvedValue(pending);
      prisma.repairTicket.findUnique.mockResolvedValue({
        id: 'ticket-1',
        finalCost: null,
        estimatedCost: null,
      });
      const updated = makePayment({ status: PaymentStatus.COMPLETED });
      prisma.payment.update.mockResolvedValue(updated);

      await service.update('pay-1', { status: PaymentStatus.COMPLETED });

      expect(prisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ paidAt: expect.any(Date) }),
        }),
      );
    });

    it('throws BadRequestException when completing would exceed remaining balance', async () => {
      prisma.payment.findUnique.mockResolvedValue(
        makePayment({ status: PaymentStatus.PENDING, amount: new Prisma.Decimal('80.00') }),
      );
      prisma.repairTicket.findUnique.mockResolvedValue({
        id: 'ticket-1',
        finalCost: new Prisma.Decimal('100.00'),
        estimatedCost: null,
      });
      prisma.payment.findMany.mockResolvedValue([{ amount: new Prisma.Decimal('50.00') }]);

      await expect(
        service.update('pay-1', { status: PaymentStatus.COMPLETED }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.payment.update).not.toHaveBeenCalled();
    });

    it('throws BadRequestException on a disallowed status transition', async () => {
      prisma.payment.findUnique.mockResolvedValue(
        makePayment({ status: PaymentStatus.REFUNDED }),
      );

      await expect(
        service.update('pay-1', { status: PaymentStatus.PENDING }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.payment.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when payment not found', async () => {
      prisma.payment.findUnique.mockResolvedValue(null);

      await expect(service.update('missing', {})).rejects.toThrow(NotFoundException);
    });
  });
});
