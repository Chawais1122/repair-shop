import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  InvoiceStatus,
  PaginatedResponse,
  StockMovementReason,
  TicketStatus,
} from '@repair-shop/shared';
import { CustomersService } from '../customers/customers.service';
import { InventoryService } from '../inventory/inventory.service';
import { PaymentsService } from '../payments/payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { TicketItemsService } from '../tickets/ticket-items.service';
import { TicketsService } from '../tickets/tickets.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { FindInvoicesQueryDto } from './dto/find-invoices-query.dto';
import { InvoiceResponseDto, InvoiceSummaryDto } from './dto/invoice-response.dto';
import { RecordInvoicePaymentDto } from './dto/record-invoice-payment.dto';
import { VoidInvoiceDto } from './dto/void-invoice.dto';

const SUMMARY_INCLUDE = {
  customer: { select: { id: true, name: true, phone: true } },
  ticket: { select: { id: true, ticketNumber: true } },
  createdBy: { select: { id: true, name: true } },
} as const;

const DETAIL_INCLUDE = {
  ...SUMMARY_INCLUDE,
  voidedBy: { select: { id: true, name: true } },
  items: { orderBy: { createdAt: 'asc' as const } },
} as const;

type InvoiceSummaryRow = Prisma.InvoiceGetPayload<{ include: typeof SUMMARY_INCLUDE }>;
type InvoiceDetailRow = Prisma.InvoiceGetPayload<{ include: typeof DETAIL_INCLUDE }>;

interface DraftLine {
  partId: string | null;
  fromTicket: boolean;
  description: string;
  quantity: number;
  unitPrice: Prisma.Decimal;
  unitCost: Prisma.Decimal;
}

const ZERO = new Prisma.Decimal(0);

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly customersService: CustomersService,
    private readonly ticketsService: TicketsService,
    private readonly ticketItemsService: TicketItemsService,
    private readonly inventoryService: InventoryService,
    private readonly paymentsService: PaymentsService,
  ) {}

  async findAll(query: FindInvoicesQueryDto): Promise<PaginatedResponse<InvoiceSummaryDto>> {
    const { search, status, customerId, from, to, page = 1, limit = 20 } = query;

    const where: Prisma.InvoiceWhereInput = {
      ...(status && { status }),
      ...(customerId && { customerId }),
      ...((from || to) && {
        createdAt: {
          ...(from && { gte: new Date(from) }),
          ...(to && { lte: new Date(to) }),
        },
      }),
      ...(search && {
        OR: [
          { invoiceNumber: { contains: search, mode: 'insensitive' } },
          { customer: { name: { contains: search, mode: 'insensitive' } } },
          { ticket: { ticketNumber: { contains: search, mode: 'insensitive' } } },
        ],
      }),
    };

    const [invoices, total] = await this.prisma.$transaction([
      this.prisma.invoice.findMany({
        where,
        include: SUMMARY_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return { data: invoices.map((i) => this.toSummaryDto(i)), meta: { page, limit, total } };
  }

  async findOne(id: string): Promise<InvoiceResponseDto> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: DETAIL_INCLUDE,
    });
    if (!invoice) throw new NotFoundException(`Invoice ${id} not found`);

    const scope = { invoiceId: invoice.id, ticketId: invoice.ticketId };
    const [payments, paid] = await Promise.all([
      this.paymentsService.listForInvoice(scope),
      this.paymentsService.sumCompletedForInvoice(scope),
    ]);
    return this.toDetailDto(invoice, payments, paid);
  }

  async findActiveForTicket(ticketId: string): Promise<InvoiceResponseDto> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { ticketId, status: { not: InvoiceStatus.VOID } },
      select: { id: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!invoice) throw new NotFoundException(`Ticket ${ticketId} has no active invoice`);
    return this.findOne(invoice.id);
  }

  async create(dto: CreateInvoiceDto, userId: string): Promise<InvoiceResponseDto> {
    if (!dto.ticketId && !dto.items?.length) {
      throw new BadRequestException('Add at least one item or a ticket to the sale');
    }

    let customerId = dto.customerId ?? null;
    const ticket = dto.ticketId ? await this.ticketsService.findOne(dto.ticketId) : null;
    if (ticket) {
      if (ticket.status === TicketStatus.CANCELLED) {
        throw new BadRequestException('Cancelled tickets cannot be invoiced');
      }
      if (ticket.invoicedAt) {
        throw new BadRequestException(`${ticket.ticketNumber} already has an active invoice`);
      }
      if (customerId && customerId !== ticket.customer.id) {
        throw new BadRequestException("The customer does not match the ticket's customer");
      }
      customerId = ticket.customer.id;
    } else if (customerId) {
      await this.customersService.findOne(customerId);
    }

    const invoiceId = await this.prisma.$transaction(async (tx) => {
      const lines: DraftLine[] = [];

      if (ticket) {
        const billable = await this.ticketItemsService.getBillableItems(ticket.id, tx);
        if (billable.length > 0) {
          lines.push(...billable.map((b) => ({ ...b, fromTicket: true })));
        } else {
          const cost = ticket.finalCost ?? ticket.estimatedCost;
          if (!cost) {
            throw new BadRequestException(
              'Add parts or labor to the ticket, or set its cost, before invoicing',
            );
          }
          lines.push({
            partId: null,
            fromTicket: true,
            description: `Repair service — ${ticket.ticketNumber}`,
            quantity: 1,
            unitPrice: new Prisma.Decimal(cost),
            unitCost: ZERO,
          });
        }
      }

      for (const item of dto.items ?? []) {
        if (item.partId) {
          const part = await this.inventoryService.getPartPricing(item.partId, tx);
          if (!part.isActive) throw new BadRequestException(`Part ${part.name} is inactive`);
          lines.push({
            partId: part.id,
            fromTicket: false,
            description: item.description ?? part.name,
            quantity: item.quantity,
            unitPrice:
              item.unitPrice !== undefined ? new Prisma.Decimal(item.unitPrice) : part.sellPrice,
            unitCost: part.costPrice,
          });
        } else {
          lines.push({
            partId: null,
            fromTicket: false,
            description: item.description!,
            quantity: item.quantity,
            unitPrice: new Prisma.Decimal(item.unitPrice!),
            unitCost: ZERO,
          });
        }
      }

      const totals = this.computeTotals(lines, dto.discount ?? 0, dto.taxRate ?? 0);
      const count = await tx.invoice.count();
      const invoiceNumber = `INV-${String(count + 1).padStart(5, '0')}`;

      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          customerId,
          ticketId: ticket?.id ?? null,
          ...totals,
          notes: dto.notes ?? null,
          createdById: userId,
          items: { create: lines },
        },
      });

      for (const line of lines) {
        if (line.partId && !line.fromTicket) {
          await this.inventoryService.applyStockChange(tx, {
            partId: line.partId,
            change: -line.quantity,
            reason: StockMovementReason.SALE,
            referenceId: invoice.id,
            note: invoiceNumber,
            userId,
          });
        }
      }

      if (ticket) {
        await this.ticketsService.markInvoiced(tx, ticket.id, totals.total);
        // Deposits taken on the ticket may already cover part of the invoice
        await this.refreshStatus(tx, invoice.id, ticket.id, totals.total);
      } else if (totals.total.lessThanOrEqualTo(0)) {
        await tx.invoice.update({
          where: { id: invoice.id },
          data: { status: InvoiceStatus.PAID },
        });
      }

      return invoice.id;
    });

    return this.findOne(invoiceId);
  }

  async recordPayment(id: string, dto: RecordInvoicePaymentDto): Promise<InvoiceResponseDto> {
    await this.prisma.$transaction(async (tx) => {
      const invoice = await this.lockInvoice(tx, id);
      if (invoice.status === InvoiceStatus.VOID) {
        throw new BadRequestException('Payments cannot be taken on a void invoice');
      }

      const scope = { invoiceId: id, ticketId: invoice.ticketId };
      const paid = await this.paymentsService.sumCompletedForInvoice(scope, tx);
      const balance = invoice.total.minus(paid);
      const amount = new Prisma.Decimal(dto.amount);
      if (amount.greaterThan(balance)) {
        throw new BadRequestException(
          `Payment of ${amount.toFixed(2)} exceeds the balance due of ${balance.toFixed(2)}`,
        );
      }

      await this.paymentsService.recordInvoicePayment(tx, {
        invoiceId: id,
        ticketId: invoice.ticketId,
        amount,
        method: dto.method,
        transactionId: dto.transactionId,
        notes: dto.notes,
      });
      await this.refreshStatus(tx, id, invoice.ticketId, invoice.total);
    });

    return this.findOne(id);
  }

  async refundPayment(id: string, paymentId: string): Promise<InvoiceResponseDto> {
    await this.prisma.$transaction(async (tx) => {
      const invoice = await this.lockInvoice(tx, id);
      const scope = { invoiceId: id, ticketId: invoice.ticketId };
      await this.paymentsService.findInInvoiceScope(paymentId, scope, tx);
      await this.paymentsService.markRefunded(tx, paymentId);
      if (invoice.status !== InvoiceStatus.VOID) {
        await this.refreshStatus(tx, id, invoice.ticketId, invoice.total);
      }
    });
    return this.findOne(id);
  }

  /**
   * Voids an invoice, returns sold retail stock and unlocks the ticket for re-invoicing.
   * Payments taken on the invoice must be refunded first; ticket deposits stay on the ticket.
   */
  async void(id: string, dto: VoidInvoiceDto, userId: string): Promise<InvoiceResponseDto> {
    await this.prisma.$transaction(async (tx) => {
      const invoice = await this.lockInvoice(tx, id);
      if (invoice.status === InvoiceStatus.VOID) {
        throw new BadRequestException('Invoice is already void');
      }

      const paidOnInvoice = await this.paymentsService.sumCompletedForInvoice(
        { invoiceId: id, ticketId: null },
        tx,
      );
      if (paidOnInvoice.greaterThan(0)) {
        throw new BadRequestException('Refund the payments on this invoice before voiding it');
      }

      const retailLines = await tx.invoiceItem.findMany({
        where: { invoiceId: id, fromTicket: false, partId: { not: null } },
        select: { partId: true, quantity: true },
      });
      for (const line of retailLines) {
        await this.inventoryService.applyStockChange(tx, {
          partId: line.partId!,
          change: line.quantity,
          reason: StockMovementReason.SALE_VOID,
          referenceId: id,
          note: `${invoice.invoiceNumber} voided`,
          userId,
        });
      }

      await tx.invoice.update({
        where: { id },
        data: {
          status: InvoiceStatus.VOID,
          voidedAt: new Date(),
          voidedById: userId,
          voidReason: dto.reason,
        },
      });

      if (invoice.ticketId) await this.ticketsService.clearInvoiced(tx, invoice.ticketId);
    });

    return this.findOne(id);
  }

  computeTotals(
    lines: Array<Pick<DraftLine, 'quantity' | 'unitPrice'>>,
    discountInput: number,
    taxRateInput: number,
  ): {
    subtotal: Prisma.Decimal;
    discount: Prisma.Decimal;
    taxRate: Prisma.Decimal;
    taxAmount: Prisma.Decimal;
    total: Prisma.Decimal;
  } {
    const subtotal = lines.reduce((sum, l) => sum.plus(l.unitPrice.times(l.quantity)), ZERO);
    const discount = new Prisma.Decimal(discountInput);
    if (discount.greaterThan(subtotal)) {
      throw new BadRequestException('Discount cannot exceed the subtotal');
    }
    const taxRate = new Prisma.Decimal(taxRateInput);
    const taxAmount = subtotal
      .minus(discount)
      .times(taxRate)
      .dividedBy(100)
      .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    const total = subtotal.minus(discount).plus(taxAmount);
    return { subtotal, discount, taxRate, taxAmount, total };
  }

  /** Row lock so concurrent payments can't both pass the balance check. */
  private async lockInvoice(
    tx: Prisma.TransactionClient,
    id: string,
  ): Promise<{
    id: string;
    invoiceNumber: string;
    status: string;
    total: Prisma.Decimal;
    ticketId: string | null;
  }> {
    await tx.$queryRaw`SELECT id FROM invoices WHERE id = ${id} FOR UPDATE`;
    const invoice = await tx.invoice.findUnique({
      where: { id },
      select: { id: true, invoiceNumber: true, status: true, total: true, ticketId: true },
    });
    if (!invoice) throw new NotFoundException(`Invoice ${id} not found`);
    return invoice;
  }

  private async refreshStatus(
    tx: Prisma.TransactionClient,
    invoiceId: string,
    ticketId: string | null,
    total: Prisma.Decimal,
  ): Promise<void> {
    const paid = await this.paymentsService.sumCompletedForInvoice({ invoiceId, ticketId }, tx);
    const status = paid.greaterThanOrEqualTo(total)
      ? InvoiceStatus.PAID
      : paid.greaterThan(0)
        ? InvoiceStatus.PARTIALLY_PAID
        : InvoiceStatus.UNPAID;
    await tx.invoice.update({ where: { id: invoiceId }, data: { status } });
  }

  private toSummaryDto(invoice: InvoiceSummaryRow): InvoiceSummaryDto {
    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status as InvoiceStatus,
      customer: invoice.customer,
      ticket: invoice.ticket,
      total: invoice.total.toFixed(2),
      createdBy: invoice.createdBy,
      createdAt: invoice.createdAt,
    };
  }

  private toDetailDto(
    invoice: InvoiceDetailRow,
    payments: InvoiceResponseDto['payments'],
    paid: Prisma.Decimal,
  ): InvoiceResponseDto {
    return {
      ...this.toSummaryDto(invoice),
      subtotal: invoice.subtotal.toFixed(2),
      discount: invoice.discount.toFixed(2),
      taxRate: invoice.taxRate.toFixed(2),
      taxAmount: invoice.taxAmount.toFixed(2),
      amountPaid: paid.toFixed(2),
      balanceDue: invoice.total.minus(paid).toFixed(2),
      notes: invoice.notes,
      items: invoice.items.map((i) => ({
        id: i.id,
        partId: i.partId,
        fromTicket: i.fromTicket,
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice.toFixed(2),
        lineTotal: i.unitPrice.times(i.quantity).toFixed(2),
      })),
      payments,
      voidedAt: invoice.voidedAt,
      voidedBy: invoice.voidedBy,
      voidReason: invoice.voidReason,
      updatedAt: invoice.updatedAt,
    };
  }
}
