import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { PaymentStatus, TicketStatus } from '@repair-shop/shared';
import { PrismaService } from '../prisma/prisma.service';
import { ReportsService } from './reports.service';

const makePrisma = () => ({
  customer: { count: jest.fn() },
  repairTicket: { count: jest.fn(), groupBy: jest.fn(), findMany: jest.fn() },
  payment: { aggregate: jest.fn(), groupBy: jest.fn() },
});

type MockPrisma = ReturnType<typeof makePrisma>;

const defaultMocks = (prisma: MockPrisma) => {
  (prisma.customer.count as jest.Mock).mockResolvedValue(0);
  (prisma.repairTicket.count as jest.Mock).mockResolvedValue(0);
  (prisma.repairTicket.groupBy as jest.Mock).mockResolvedValue([]);
  (prisma.repairTicket.findMany as jest.Mock).mockResolvedValue([]);
  (prisma.payment.aggregate as jest.Mock).mockResolvedValue({ _sum: { amount: null } });
  (prisma.payment.groupBy as jest.Mock).mockResolvedValue([]);
};

describe('ReportsService', () => {
  let service: ReportsService;
  let prisma: MockPrisma;

  beforeEach(async () => {
    prisma = makePrisma();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<ReportsService>(ReportsService);
  });

  it('returns correct customer and ticket totals', async () => {
    defaultMocks(prisma);
    (prisma.customer.count as jest.Mock).mockResolvedValue(3);
    (prisma.repairTicket.count as jest.Mock).mockResolvedValue(5);

    const result = await service.getDashboard();

    expect(result.totalCustomers).toBe(3);
    expect(result.totalTickets).toBe(5);
  });

  it('fills all statuses with defaults when groupBy returns partial results', async () => {
    defaultMocks(prisma);
    (prisma.repairTicket.groupBy as jest.Mock).mockResolvedValue([
      { status: 'RECEIVED', _count: { _all: 2 } },
    ]);

    const result = await service.getDashboard();

    expect(result.ticketsByStatus[TicketStatus.RECEIVED]).toBe(2);
    expect(result.ticketsByStatus[TicketStatus.DIAGNOSING]).toBe(0);
    expect(result.ticketsByStatus[TicketStatus.CANCELLED]).toBe(0);
    expect(Object.keys(result.ticketsByStatus)).toHaveLength(
      Object.values(TicketStatus).length,
    );
  });

  it('calculates totalRevenue from completed payment sum', async () => {
    defaultMocks(prisma);
    (prisma.payment.aggregate as jest.Mock).mockResolvedValue({
      _sum: { amount: new Prisma.Decimal('250.00') },
    });

    const result = await service.getDashboard();

    expect(new Prisma.Decimal(result.totalRevenue).equals(new Prisma.Decimal('250.00'))).toBe(true);
  });

  it('calculates outstanding balance summing only positive remainders', async () => {
    defaultMocks(prisma);
    (prisma.repairTicket.findMany as jest.Mock)
      .mockResolvedValueOnce([]) // recentTickets (first findMany call)
      .mockResolvedValueOnce([   // ticketsWithCosts (second findMany call)
        { id: 'ticket-1', finalCost: new Prisma.Decimal('100.00'), estimatedCost: null },
        { id: 'ticket-2', finalCost: new Prisma.Decimal('50.00'), estimatedCost: null },
      ]);
    (prisma.payment.groupBy as jest.Mock).mockResolvedValue([
      { ticketId: 'ticket-1', _sum: { amount: new Prisma.Decimal('40.00') } },
      { ticketId: 'ticket-2', _sum: { amount: new Prisma.Decimal('50.00') } },
    ]);

    const result = await service.getDashboard();

    // ticket-1: 100 - 40 = 60 outstanding, ticket-2: 50 - 50 = 0
    expect(new Prisma.Decimal(result.outstandingBalance).equals(new Prisma.Decimal('60'))).toBe(true);
  });

  it('maps recent tickets with correct fields', async () => {
    defaultMocks(prisma);
    const now = new Date();
    (prisma.repairTicket.findMany as jest.Mock)
      .mockResolvedValueOnce([
        {
          id: 't1',
          ticketNumber: 'TKT-0001',
          status: 'RECEIVED',
          priority: 'NORMAL',
          customer: { name: 'John Smith' },
          device: { brand: 'Apple', model: 'iPhone 14' },
          createdAt: now,
        },
      ])
      .mockResolvedValueOnce([]); // ticketsWithCosts
    (prisma.payment.groupBy as jest.Mock).mockResolvedValue([]);

    const result = await service.getDashboard();

    expect(result.recentTickets).toHaveLength(1);
    expect(result.recentTickets[0]!.ticketNumber).toBe('TKT-0001');
    expect(result.recentTickets[0]!.customerName).toBe('John Smith');
    expect(result.recentTickets[0]!.deviceLabel).toBe('Apple iPhone 14');
    expect(result.recentTickets[0]!.createdAt).toBe(now);
  });
});
