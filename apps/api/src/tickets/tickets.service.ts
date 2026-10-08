import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DeviceType, PaginatedResponse, Priority, TicketStatus } from '@repair-shop/shared';
import { CustomersService } from '../customers/customers.service';
import { DevicesService } from '../devices/devices.service';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { ALLOWED_TRANSITIONS } from './ticket-transitions';
import { AssignTechnicianDto } from './dto/assign-technician.dto';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { FindTicketsQueryDto } from './dto/find-tickets-query.dto';
import { StatusHistoryItemDto, TicketResponseDto } from './dto/ticket-response.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';

const FULL_INCLUDE = {
  customer: { select: { id: true, name: true, phone: true } },
  device: { select: { id: true, brand: true, model: true, type: true } },
  assignedTo: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
  statusHistory: {
    include: { changedBy: { select: { id: true, name: true } } },
    orderBy: { changedAt: 'asc' as const },
  },
} as const;

type TicketWithRelations = Prisma.RepairTicketGetPayload<{
  include: typeof FULL_INCLUDE;
}>;

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly customersService: CustomersService,
    private readonly devicesService: DevicesService,
    private readonly usersService: UsersService,
  ) {}

  async findAll(query: FindTicketsQueryDto): Promise<PaginatedResponse<TicketResponseDto>> {
    const { search, status, assignedToId, customerId, page = 1, limit = 20 } = query;

    const where: Prisma.RepairTicketWhereInput = {
      ...(status && { status }),
      ...(assignedToId && { assignedToId }),
      ...(customerId && { customerId }),
      ...(search && {
        OR: [
          { ticketNumber: { contains: search, mode: 'insensitive' } },
          { customer: { name: { contains: search, mode: 'insensitive' } } },
        ],
      }),
    };

    const [tickets, total] = await this.prisma.$transaction([
      this.prisma.repairTicket.findMany({
        where,
        include: FULL_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.repairTicket.count({ where }),
    ]);

    return {
      data: (tickets as TicketWithRelations[]).map((t) => this.toResponseDto(t)),
      meta: { page, limit, total },
    };
  }

  async findOne(id: string): Promise<TicketResponseDto> {
    const ticket = await this.prisma.repairTicket.findUnique({
      where: { id },
      include: FULL_INCLUDE,
    });
    if (!ticket) throw new NotFoundException(`Ticket ${id} not found`);
    return this.toResponseDto(ticket as TicketWithRelations);
  }

  async create(dto: CreateTicketDto, createdById: string): Promise<TicketResponseDto> {
    await this.customersService.findOne(dto.customerId);

    const device = await this.devicesService.findOne(dto.deviceId);
    if (device.customerId !== dto.customerId) {
      throw new BadRequestException('Device does not belong to the specified customer');
    }

    const count = await this.prisma.repairTicket.count();
    const ticketNumber = `TKT-${String(count + 1).padStart(4, '0')}`;

    const ticket = await this.prisma.$transaction(async (tx) => {
      const created = await tx.repairTicket.create({
        data: {
          ticketNumber,
          customerId: dto.customerId,
          deviceId: dto.deviceId,
          createdById,
          priority: dto.priority ?? Priority.NORMAL,
          reportedProblem: dto.reportedProblem,
          expectedCompletionAt: dto.expectedCompletionAt
            ? new Date(dto.expectedCompletionAt)
            : null,
        },
      });
      await tx.ticketStatusHistory.create({
        data: {
          ticketId: created.id,
          fromStatus: null,
          toStatus: TicketStatus.RECEIVED,
          changedById: createdById,
        },
      });
      return created;
    });

    return this.findOne(ticket.id);
  }

  async update(id: string, dto: UpdateTicketDto): Promise<TicketResponseDto> {
    const existing = await this.findOne(id);
    if (existing.invoicedAt && dto.finalCost !== undefined) {
      throw new BadRequestException('The final cost is set by the invoice and cannot be changed');
    }

    const data: Prisma.RepairTicketUpdateInput = {
      ...(dto.priority !== undefined && { priority: dto.priority }),
      ...(dto.reportedProblem !== undefined && { reportedProblem: dto.reportedProblem }),
      ...(dto.diagnosis !== undefined && { diagnosis: dto.diagnosis || null }),
      ...(dto.estimatedCost !== undefined && { estimatedCost: dto.estimatedCost ?? null }),
      ...(dto.finalCost !== undefined && { finalCost: dto.finalCost ?? null }),
      ...(dto.expectedCompletionAt !== undefined && {
        expectedCompletionAt: dto.expectedCompletionAt ? new Date(dto.expectedCompletionAt) : null,
      }),
    };

    await this.prisma.repairTicket.update({ where: { id }, data });
    return this.findOne(id);
  }

  async updateStatus(
    id: string,
    dto: UpdateTicketStatusDto,
    changedById: string,
  ): Promise<TicketResponseDto> {
    const ticket = await this.findOne(id);

    const allowed = ALLOWED_TRANSITIONS[ticket.status];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(`Cannot transition from ${ticket.status} to ${dto.status}`);
    }

    const completedAt = [TicketStatus.DELIVERED, TicketStatus.CANCELLED].includes(dto.status)
      ? new Date()
      : undefined;

    await this.prisma.$transaction(async (tx) => {
      await tx.repairTicket.update({
        where: { id },
        data: { status: dto.status, ...(completedAt && { completedAt }) },
      });
      await tx.ticketStatusHistory.create({
        data: {
          ticketId: id,
          fromStatus: ticket.status,
          toStatus: dto.status,
          changedById,
          notes: dto.notes ?? null,
        },
      });
    });

    return this.findOne(id);
  }

  async assignTechnician(id: string, dto: AssignTechnicianDto): Promise<TicketResponseDto> {
    await this.findOne(id);

    if (dto.assignedToId) {
      const user = await this.usersService.findById(dto.assignedToId);
      if (!user) throw new NotFoundException(`User ${dto.assignedToId} not found`);
    }

    await this.prisma.repairTicket.update({
      where: { id },
      data: { assignedToId: dto.assignedToId ?? null },
    });

    return this.findOne(id);
  }

  /** Called by invoicing: the invoice total becomes the ticket's final cost. */
  async markInvoiced(
    tx: Prisma.TransactionClient,
    ticketId: string,
    total: Prisma.Decimal,
  ): Promise<void> {
    const { count } = await tx.repairTicket.updateMany({
      where: { id: ticketId, invoicedAt: null },
      data: { invoicedAt: new Date(), finalCost: total },
    });
    if (count === 0) {
      throw new BadRequestException('This ticket already has an active invoice');
    }
  }

  /** Called when a ticket's invoice is voided so the ticket can be edited and invoiced again. */
  async clearInvoiced(tx: Prisma.TransactionClient, ticketId: string): Promise<void> {
    await tx.repairTicket.update({ where: { id: ticketId }, data: { invoicedAt: null } });
  }

  private toResponseDto(ticket: TicketWithRelations): TicketResponseDto {
    return {
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      status: ticket.status as TicketStatus,
      priority: ticket.priority as Priority,
      reportedProblem: ticket.reportedProblem,
      diagnosis: ticket.diagnosis,
      estimatedCost: ticket.estimatedCost?.toString() ?? null,
      finalCost: ticket.finalCost?.toString() ?? null,
      receivedAt: ticket.receivedAt,
      expectedCompletionAt: ticket.expectedCompletionAt,
      completedAt: ticket.completedAt,
      invoicedAt: ticket.invoicedAt,
      customer: ticket.customer,
      device: {
        id: ticket.device.id,
        brand: ticket.device.brand,
        model: ticket.device.model,
        type: ticket.device.type as DeviceType,
      },
      assignedTo: ticket.assignedTo,
      createdBy: ticket.createdBy,
      statusHistory: ticket.statusHistory.map((h): StatusHistoryItemDto => ({
        id: h.id,
        fromStatus: h.fromStatus as TicketStatus | null,
        toStatus: h.toStatus as TicketStatus,
        notes: h.notes,
        changedBy: h.changedBy,
        changedAt: h.changedAt,
      })),
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
    };
  }
}
