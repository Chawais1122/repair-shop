import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Payment, Prisma } from '@prisma/client';
import { PaymentMethod, PaymentStatus } from '@repair-shop/shared';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentResponseDto, PaymentSummaryDto } from './dto/payment-response.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';

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
    const isFullyPaid =
      remaining !== null && remaining.lessThanOrEqualTo(new Prisma.Decimal(0));

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
      select: { id: true, finalCost: true, estimatedCost: true },
    });
    if (!ticket) throw new NotFoundException(`Ticket ${ticketId} not found`);

    const status = dto.status ?? PaymentStatus.COMPLETED;

    if (status === PaymentStatus.COMPLETED) {
      const totalCost = ticket.finalCost ?? ticket.estimatedCost;
      if (totalCost !== null) {
        const existingPaid = (
          await this.prisma.payment.findMany({
            where: { ticketId, status: PaymentStatus.COMPLETED },
            select: { amount: true },
          })
        ).reduce((s, p) => s.plus(p.amount), new Prisma.Decimal(0));

        const remaining = totalCost.minus(existingPaid);
        const newAmount = new Prisma.Decimal(dto.amount);

        if (newAmount.greaterThan(remaining)) {
          throw new BadRequestException(
            `Payment amount ${dto.amount} exceeds remaining balance of ${remaining.toString()}`,
          );
        }
      }
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
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) throw new NotFoundException(`Payment ${id} not found`);

    const paidAt =
      dto.status === PaymentStatus.COMPLETED &&
      payment.status !== PaymentStatus.COMPLETED
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

  private toResponseDto(payment: Payment): PaymentResponseDto {
    return {
      id: payment.id,
      ticketId: payment.ticketId,
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
