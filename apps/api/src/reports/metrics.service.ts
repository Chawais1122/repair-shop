import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { eachDayKey } from '../common/utils/date-range';
import { InvoicesService } from '../invoices/invoices.service';
import { PaymentsService } from '../payments/payments.service';
import { TicketsService } from '../tickets/tickets.service';
import { TimeClockService } from '../time-clock/time-clock.service';
import { UsersService } from '../users/users.service';
import { MetricsQueryDto, MetricsResponseDto, StaffPerformanceDto } from './dto/metrics.dto';

const MAX_RANGE_DAYS = 366;
const ZERO = new Prisma.Decimal(0);
const AVG_DAYS_PER_MONTH = 30.44;

const money = (d: Prisma.Decimal): string => d.toFixed(2);
const percent = (part: Prisma.Decimal, whole: Prisma.Decimal): number | null =>
  whole.isZero() ? null : Math.round(part.dividedBy(whole).times(1000).toNumber()) / 10;

@Injectable()
export class MetricsService {
  constructor(
    private readonly invoicesService: InvoicesService,
    private readonly paymentsService: PaymentsService,
    private readonly ticketsService: TicketsService,
    private readonly timeClockService: TimeClockService,
    private readonly usersService: UsersService,
  ) {}

  async getMetrics(query: MetricsQueryDto): Promise<MetricsResponseDto> {
    const from = new Date(query.from);
    const to = new Date(query.to);
    if (to <= from) throw new BadRequestException('"to" must be after "from"');
    const days = (to.getTime() - from.getTime()) / 86_400_000;
    if (days > MAX_RANGE_DAYS) {
      throw new BadRequestException(`Date range cannot exceed ${MAX_RANGE_DAYS} days`);
    }

    const [sales, collected, repairs, minutesByUser, staff] = await Promise.all([
      this.invoicesService.getSalesSummary(from, to),
      this.paymentsService.getCollected(from, to),
      this.ticketsService.getRepairStats(from, to),
      this.timeClockService.getWorkedMinutesByUser(from, to),
      this.usersService.findActiveForReports(),
    ]);

    // Labor: hours on the clock × each employee's hourly rate
    const rates = new Map(staff.map((u) => [u.id, new Prisma.Decimal(u.hourlyRate ?? 0)]));
    let laborCost = ZERO;
    let totalMinutes = 0;
    for (const [userId, minutes] of minutesByUser) {
      totalMinutes += minutes;
      laborCost = laborCost.plus((rates.get(userId) ?? ZERO).times(minutes).dividedBy(60));
    }
    laborCost = laborCost.toDecimalPlaces(2);
    const hoursWorked = Math.round((totalMinutes / 60) * 10) / 10;

    const grossProfit = sales.netSales.minus(sales.costOfGoods);

    const staffRows: StaffPerformanceDto[] = staff
      .map((u) => {
        const s = sales.byEmployee.get(u.id);
        const netSales = s?.netSales ?? ZERO;
        const minutes = minutesByUser.get(u.id) ?? 0;
        const target = u.monthlySalesTarget
          ? new Prisma.Decimal(u.monthlySalesTarget)
              .times(days)
              .dividedBy(AVG_DAYS_PER_MONTH)
              .toDecimalPlaces(2)
          : null;
        return {
          user: { id: u.id, name: u.name, role: u.role },
          netSales: money(netSales),
          invoiceCount: s?.invoiceCount ?? 0,
          repairsCompleted: repairs.completedByTechnician.get(u.id) ?? 0,
          hoursWorked: Math.round((minutes / 60) * 10) / 10,
          salesPerHour: minutes > 0 ? money(netSales.times(60).dividedBy(minutes)) : null,
          periodTarget: target ? money(target) : null,
          targetProgress: target ? percent(netSales, target) : null,
        };
      })
      .sort((a, b) => Number(b.netSales) - Number(a.netSales));

    return {
      period: { from, to, days: Math.round(days * 10) / 10 },
      sales: {
        invoiceCount: sales.invoiceCount,
        grossSales: money(sales.grossSales),
        netSales: money(sales.netSales),
        tax: money(sales.tax),
        discounts: money(sales.discounts),
        averageSale:
          sales.invoiceCount > 0 ? money(sales.netSales.dividedBy(sales.invoiceCount)) : null,
      },
      profit: {
        costOfGoods: money(sales.costOfGoods),
        grossProfit: money(grossProfit),
        grossMarginPercent: percent(grossProfit, sales.netSales),
        laborCost: money(laborCost),
        profitAfterLabor: money(grossProfit.minus(laborCost)),
      },
      productivity: {
        hoursWorked,
        revenuePerLaborHour:
          totalMinutes > 0 ? money(sales.netSales.times(60).dividedBy(totalMinutes)) : null,
      },
      collected: {
        total: money(collected.total),
        byMethod: collected.byMethod
          .map((m) => ({ method: m.method, total: money(m.total), count: m.count }))
          .sort((a, b) => Number(b.total) - Number(a.total)),
      },
      repairs: {
        created: repairs.created,
        completed: repairs.completed,
        cancelled: repairs.cancelled,
        averageTurnaroundHours: repairs.averageTurnaroundHours,
      },
      daily: eachDayKey(from, to).map((date) => ({
        date,
        netSales: money(sales.netSalesByDay.get(date) ?? ZERO),
        collected: money(collected.byDay.get(date) ?? ZERO),
      })),
      topProducts: sales.topProducts.map((p) => ({
        partId: p.partId,
        name: p.description,
        quantity: p.quantity,
        revenue: money(p.revenue),
      })),
      staff: staffRows,
    };
  }
}
