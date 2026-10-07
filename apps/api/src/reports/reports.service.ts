import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaymentStatus, Priority, TicketStatus } from '@repair-shop/shared';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardResponseDto, RecentTicketDto } from './dto/dashboard-response.dto';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(): Promise<DashboardResponseDto> {
    const [
      totalCustomers,
      totalTickets,
      rawStatusCounts,
      recentTicketsRaw,
      revenueResult,
      paidByTicket,
      ticketsWithCosts,
    ] = await Promise.all([
      this.prisma.customer.count(),
      this.prisma.repairTicket.count(),
      this.prisma.repairTicket.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      this.prisma.repairTicket.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { name: true } },
          device: { select: { brand: true, model: true } },
        },
      }),
      this.prisma.payment.aggregate({
        where: { status: PaymentStatus.COMPLETED },
        _sum: { amount: true },
      }),
      this.prisma.payment.groupBy({
        by: ['ticketId'],
        where: { status: PaymentStatus.COMPLETED },
        _sum: { amount: true },
      }),
      this.prisma.repairTicket.findMany({
        where: {
          OR: [{ finalCost: { not: null } }, { estimatedCost: { not: null } }],
        },
        select: { id: true, finalCost: true, estimatedCost: true },
      }),
    ]);

    const allStatuses = Object.values(TicketStatus);
    const ticketsByStatus = Object.fromEntries(
      allStatuses.map((s) => [s, rawStatusCounts.find((r) => r.status === s)?._count._all ?? 0]),
    ) as Record<TicketStatus, number>;

    const totalRevenue = (revenueResult._sum.amount ?? new Prisma.Decimal(0)).toString();

    let outstanding = new Prisma.Decimal(0);
    for (const ticket of ticketsWithCosts) {
      const cost = ticket.finalCost ?? ticket.estimatedCost!;
      const paidEntry = paidByTicket.find((p) => p.ticketId === ticket.id);
      const paid = paidEntry?._sum?.amount ?? new Prisma.Decimal(0);
      const remaining = cost.minus(paid);
      if (remaining.greaterThan(0)) {
        outstanding = outstanding.plus(remaining);
      }
    }
    const outstandingBalance = outstanding.toString();

    const recentTickets: RecentTicketDto[] = recentTicketsRaw.map((t) => ({
      id: t.id,
      ticketNumber: t.ticketNumber,
      status: t.status as TicketStatus,
      priority: t.priority as Priority,
      customerName: t.customer.name,
      deviceLabel: `${t.device.brand} ${t.device.model}`,
      createdAt: t.createdAt,
    }));

    return {
      totalCustomers,
      totalTickets,
      ticketsByStatus,
      totalRevenue,
      outstandingBalance,
      recentTickets,
    };
  }
}
