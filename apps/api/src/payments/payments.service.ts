import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Payment, Prisma } from '@prisma/client';
import { PaymentMethod, PaymentStatus } from '@repair-shop/shared';
import { dayKey } from '../common/utils/date-range';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentResponseDto, PaymentSummaryDto } from './dto/payment-response.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';

const ALLOWED_STATUS_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  [PaymentStatus.PENDING]: [PaymentStatus.COMPLETED],
  [PaymentStatus.COMPLETED]: [PaymentStatus.REFUNDED],
  [PaymentStatus.REFUNDED]: [],
};

export interface CollectedPayments {
  total: Prisma.Decimal;
  byMethod: Array<{ method: PaymentMethod; total: Prisma.Decimal; count: number }>;
  byDay: Map<string, Prisma.Decimal>;
}

export interface InvoicePaymentScope {
  invoiceId: string;
  /** Set for ticket invoices so earlier ticket deposits count toward the balance. */
  ticketId: string | null;
}

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(ticketId: string): Promise<PaymentSummaryDto> {
    const ticket = await this.prisma.repairTicket.findUnique({
      where: { id: ticketId },
      select: { finalCost: true, estimatedCost: true },
    });
    if (!ticket) throw new NotFoundException(`Ticket ${ticketId} not found`);

    const payments = await this.prisma.payment.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'asc' },
    });

    const totalCost = ticket.finalCost ?? ticket.estimatedCost;

    const paidAmount = payments
      .filter((p) => p.status === PaymentStatus.COMPLETED)
      .reduce((sum, p) => sum.plus(p.amount), new Prisma.Decimal(0));

    const remaining = totalCost ? totalCost.minus(paidAmount) : null;
    const isFullyPaid = remaining !== null && remaining.lessThanOrEqualTo(new Prisma.Decimal(0));

    return {
      totalCost: totalCost ? totalCost.toString() : null,
      paidAmount: paidAmount.toString(),
      remainingAmount: remaining ? remaining.toString() : null,
      isFullyPaid,
      payments: payments.map((p) => this.toResponseDto(p)),
    };
  }

  async create(ticketId: string, dto: CreatePaymentDto): Promise<PaymentResponseDto> {
    const ticket = await this.prisma.repairTicket.findUnique({
      where: { id: ticketId },
      select: { id: true, finalCost: true, estimatedCost: true, invoicedAt: true },
    });
    if (!ticket) throw new NotFoundException(`Ticket ${ticketId} not found`);
    if (ticket.invoicedAt) {
      throw new BadRequestException('This ticket has been invoiced. Take payment on the invoice.');
    }

    const status = dto.status ?? PaymentStatus.COMPLETED;

    if (status === PaymentStatus.COMPLETED) {
      await this.assertWithinRemainingBalance(ticket, new Prisma.Decimal(dto.amount));
    }

    const paidAt = status === PaymentStatus.COMPLETED ? new Date() : null;

    const payment = await this.prisma.payment.create({
      data: {
        ticketId,
        amount: new Prisma.Decimal(dto.amount),
        method: dto.method,
        status,
        transactionId: dto.transactionId ?? null,
        notes: dto.notes ?? null,
        paidAt,
      },
    });

    return this.toResponseDto(payment);
  }

  async update(id: string, dto: UpdatePaymentDto): Promise<PaymentResponseDto> {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: { ticket: { select: { invoicedAt: true } } },
    });
    if (!payment) throw new NotFoundException(`Payment ${id} not found`);
    // Invoice balances are derived from these payments, so the invoice owns their changes
    if (payment.invoiceId || payment.ticket?.invoicedAt) {
      throw new BadRequestException('Manage this payment from its invoice.');
    }

    const currentStatus = payment.status as PaymentStatus;
    if (dto.status !== undefined && dto.status !== currentStatus) {
      if (!ALLOWED_STATUS_TRANSITIONS[currentStatus].includes(dto.status)) {
        throw new BadRequestException(
          `Cannot change payment status from ${currentStatus} to ${dto.status}`,
        );
      }

      if (dto.status === PaymentStatus.COMPLETED && payment.ticketId) {
        const ticket = await this.prisma.repairTicket.findUnique({
          where: { id: payment.ticketId },
          select: { id: true, finalCost: true, estimatedCost: true },
        });
        if (!ticket) throw new NotFoundException(`Ticket ${payment.ticketId} not found`);
        await this.assertWithinRemainingBalance(ticket, payment.amount);
      }
    }

    const paidAt =
      dto.status === PaymentStatus.COMPLETED && payment.status !== PaymentStatus.COMPLETED
        ? new Date()
        : undefined;

    const updated = await this.prisma.payment.update({
      where: { id },
      data: {
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(paidAt !== undefined && { paidAt }),
      },
    });

    return this.toResponseDto(updated);
  }

  /** Money actually collected (completed payments by paid date), for reports. */
  async getCollected(from: Date, to: Date): Promise<CollectedPayments> {
    const payments = await this.prisma.payment.findMany({
      where: { status: PaymentStatus.COMPLETED, paidAt: { gte: from, lt: to } },
      select: { amount: true, method: true, paidAt: true },
    });

    const zero = new Prisma.Decimal(0);
    let total = zero;
    const methods = new Map<PaymentMethod, { total: Prisma.Decimal; count: number }>();
    const byDay = new Map<string, Prisma.Decimal>();
    for (const p of payments) {
      const method = p.method as PaymentMethod;
      total = total.plus(p.amount);
      const m = methods.get(method) ?? { total: zero, count: 0 };
      methods.set(method, { total: m.total.plus(p.amount), count: m.count + 1 });
      const key = dayKey(p.paidAt!);
      byDay.set(key, (byDay.get(key) ?? zero).plus(p.amount));
    }

    return {
      total,
      byMethod: [...methods.entries()].map(([method, v]) => ({ method, ...v })),
      byDay,
    };
  }

  // ─── Invoice support ────────────────────────────────────────────────────────
  // An invoice's payments are those recorded against it plus, for a ticket invoice,
  // deposits taken on the ticket before it was invoiced.

  async sumCompletedForInvoice(
    scope: InvoicePaymentScope,
    client: Prisma.TransactionClient = this.prisma,
  ): Promise<Prisma.Decimal> {
    const result = await client.payment.aggregate({
      where: { ...this.invoiceScopeWhere(scope), status: PaymentStatus.COMPLETED },
      _sum: { amount: true },
    });
    return result._sum.amount ?? new Prisma.Decimal(0);
  }

  async listForInvoice(
    scope: InvoicePaymentScope,
    client: Prisma.TransactionClient = this.prisma,
  ): Promise<PaymentResponseDto[]> {
    const payments = await client.payment.findMany({
      where: this.invoiceScopeWhere(scope),
      orderBy: { createdAt: 'asc' },
    });
    return payments.map((p) => this.toResponseDto(p));
  }

  async findInInvoiceScope(
    paymentId: string,
    scope: InvoicePaymentScope,
    client: Prisma.TransactionClient = this.prisma,
  ): Promise<PaymentResponseDto> {
    const payment = await client.payment.findFirst({
      where: { id: paymentId, ...this.invoiceScopeWhere(scope) },
    });
    if (!payment) throw new NotFoundException(`Payment ${paymentId} not found on this invoice`);
    return this.toResponseDto(payment);
  }

  async recordInvoicePayment(
    tx: Prisma.TransactionClient,
    input: {
      invoiceId: string;
      ticketId: string | null;
      amount: Prisma.Decimal;
      method: PaymentMethod;
      transactionId?: string;
      notes?: string;
    },
  ): Promise<PaymentResponseDto> {
    const payment = await tx.payment.create({
      data: {
        invoiceId: input.invoiceId,
        ticketId: input.ticketId,
        amount: input.amount,
        method: input.method,
        status: PaymentStatus.COMPLETED,
        transactionId: input.transactionId ?? null,
        notes: input.notes ?? null,
        paidAt: new Date(),
      },
    });
    return this.toResponseDto(payment);
  }

  async markRefunded(tx: Prisma.TransactionClient, paymentId: string): Promise<void> {
    const { count } = await tx.payment.updateMany({
      where: { id: paymentId, status: PaymentStatus.COMPLETED },
      data: { status: PaymentStatus.REFUNDED },
    });
    if (count === 0) throw new BadRequestException('Only completed payments can be refunded');
  }

  private invoiceScopeWhere(scope: InvoicePaymentScope): Prisma.PaymentWhereInput {
    return scope.ticketId
      ? { OR: [{ invoiceId: scope.invoiceId }, { ticketId: scope.ticketId, invoiceId: null }] }
      : { invoiceId: scope.invoiceId };
  }

  private async assertWithinRemainingBalance(
    ticket: { id: string; finalCost: Prisma.Decimal | null; estimatedCost: Prisma.Decimal | null },
    amount: Prisma.Decimal,
  ): Promise<void> {
    const totalCost = ticket.finalCost ?? ticket.estimatedCost;
    if (totalCost === null) return;

    const existingPaid = (
      await this.prisma.payment.findMany({
        where: { ticketId: ticket.id, status: PaymentStatus.COMPLETED },
        select: { amount: true },
      })
    ).reduce((s, p) => s.plus(p.amount), new Prisma.Decimal(0));

    const remaining = totalCost.minus(existingPaid);
    if (amount.greaterThan(remaining)) {
      throw new BadRequestException(
        `Payment amount ${amount.toString()} exceeds remaining balance of ${remaining.toString()}`,
      );
    }
  }

  private toResponseDto(payment: Payment): PaymentResponseDto {
    return {
      id: payment.id,
      ticketId: payment.ticketId,
      invoiceId: payment.invoiceId,
      amount: payment.amount.toString(),
      method: payment.method as PaymentMethod,
      status: payment.status as PaymentStatus,
      transactionId: payment.transactionId,
      paidAt: payment.paidAt,
      notes: payment.notes,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }
}
