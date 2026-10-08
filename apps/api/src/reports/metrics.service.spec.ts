import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { PaymentMethod, UserRole } from '@repair-shop/shared';
import { InvoicesService } from '../invoices/invoices.service';
import { PaymentsService } from '../payments/payments.service';
import { TicketsService } from '../tickets/tickets.service';
import { TimeClockService } from '../time-clock/time-clock.service';
import { UsersService } from '../users/users.service';
import { MetricsService } from './metrics.service';

const D = (v: number | string) => new Prisma.Decimal(v);

const staff = [
  {
    id: 'tech',
    name: 'Tech',
    role: UserRole.TECHNICIAN,
    hourlyRate: '20.00',
    monthlySalesTarget: null,
  },
  {
    id: 'desk',
    name: 'Desk',
    role: UserRole.STAFF,
    hourlyRate: '15.00',
    // ~30.44 days -> 3044 target means ~100/day
    monthlySalesTarget: '3044.00',
  },
];

describe('MetricsService', () => {
  let service: MetricsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetricsService,
        {
          provide: InvoicesService,
          useValue: {
            getSalesSummary: jest.fn().mockResolvedValue({
              invoiceCount: 4,
              grossSales: D(1082.5),
              netSales: D(1000),
              tax: D(82.5),
              discounts: D(20),
              costOfGoods: D(300),
              netSalesByDay: new Map([['2026-10-05', D(400)]]),
              byEmployee: new Map([['desk', { netSales: D(500), invoiceCount: 2 }]]),
              topProducts: [{ partId: 'p1', description: 'Screen', quantity: 2, revenue: D(300) }],
            }),
          },
        },
        {
          provide: PaymentsService,
          useValue: {
            getCollected: jest.fn().mockResolvedValue({
              total: D(900),
              byMethod: [
                { method: PaymentMethod.CASH, total: D(300), count: 3 },
                { method: PaymentMethod.CARD, total: D(600), count: 2 },
              ],
              byDay: new Map([['2026-10-06', D(900)]]),
            }),
          },
        },
        {
          provide: TicketsService,
          useValue: {
            getRepairStats: jest.fn().mockResolvedValue({
              created: 6,
              completed: 3,
              cancelled: 1,
              averageTurnaroundHours: 26.5,
              completedByTechnician: new Map([['tech', 3]]),
            }),
          },
        },
        {
          provide: TimeClockService,
          useValue: {
            getWorkedMinutesByUser: jest.fn().mockResolvedValue(
              new Map([
                ['tech', 1200], // 20h
                ['desk', 1200], // 20h
              ]),
            ),
          },
        },
        {
          provide: UsersService,
          useValue: { findActiveForReports: jest.fn().mockResolvedValue(staff) },
        },
      ],
    }).compile();
    service = module.get(MetricsService);
  });

  const query = { from: '2026-10-05T00:00:00', to: '2026-10-12T00:00:00' };

  it('computes profit after cost of goods and labor', async () => {
    const m = await service.getMetrics(query);
    expect(m.profit).toEqual({
      costOfGoods: '300.00',
      grossProfit: '700.00',
      grossMarginPercent: 70,
      // 20h × $20 + 20h × $15
      laborCost: '700.00',
      profitAfterLabor: '0.00',
    });
  });

  it('reports revenue per labor hour from net sales and clocked hours', async () => {
    const m = await service.getMetrics(query);
    expect(m.productivity).toEqual({ hoursWorked: 40, revenuePerLaborHour: '25.00' });
    expect(m.sales.averageSale).toBe('250.00');
  });

  it('fills every day of the period, including days without sales', async () => {
    const m = await service.getMetrics(query);
    expect(m.daily).toHaveLength(7);
    expect(m.daily[0]).toEqual({ date: '2026-10-05', netSales: '400.00', collected: '0.00' });
    expect(m.daily[1]).toEqual({ date: '2026-10-06', netSales: '0.00', collected: '900.00' });
  });

  it('prorates monthly targets and ranks staff by sales', async () => {
    const m = await service.getMetrics(query);
    expect(m.staff[0]).toMatchObject({
      user: { id: 'desk' },
      netSales: '500.00',
      periodTarget: '700.00',
      targetProgress: 71.4,
      salesPerHour: '25.00',
    });
    expect(m.staff[1]).toMatchObject({
      user: { id: 'tech' },
      repairsCompleted: 3,
      periodTarget: null,
      targetProgress: null,
    });
  });

  it('rejects an inverted or oversized range', async () => {
    await expect(service.getMetrics({ from: query.to, to: query.from })).rejects.toThrow(
      BadRequestException,
    );
    await expect(
      service.getMetrics({ from: '2025-01-01T00:00:00', to: '2026-06-01T00:00:00' }),
    ).rejects.toThrow(BadRequestException);
  });
});
