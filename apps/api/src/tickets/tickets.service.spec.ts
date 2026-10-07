import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Priority, TicketStatus } from '@repair-shop/shared';
import { PrismaService } from '../prisma/prisma.service';
import { CustomersService } from '../customers/customers.service';
import { DevicesService } from '../devices/devices.service';
import { UsersService } from '../users/users.service';
import { TicketsService } from './tickets.service';

const now = new Date();

const mockCustomer = { id: 'cust-1', name: 'John Smith', phone: '+15551234567' };
const mockDevice = { id: 'dev-1', customerId: 'cust-1', brand: 'Apple', model: 'iPhone', type: 'PHONE' };
const mockUser = { id: 'user-1', name: 'Tech One', email: 'tech@shop.com' };

const mockTicketRaw = {
  id: 'ticket-1',
  ticketNumber: 'TKT-0001',
  customerId: 'cust-1',
  deviceId: 'dev-1',
  assignedToId: null,
  createdById: 'user-1',
  status: TicketStatus.RECEIVED,
  priority: Priority.NORMAL,
  reportedProblem: 'Screen cracked',
  diagnosis: null,
  estimatedCost: null,
  finalCost: null,
  receivedAt: now,
  expectedCompletionAt: null,
  completedAt: null,
  createdAt: now,
  updatedAt: now,
  customer: mockCustomer,
  device: mockDevice,
  assignedTo: null,
  createdBy: mockUser,
  statusHistory: [],
};

describe('TicketsService', () => {
  let service: TicketsService;
  let prisma: {
    repairTicket: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    ticketStatusHistory: { create: jest.Mock };
    $transaction: jest.Mock;
  };
  let customersService: { findOne: jest.Mock };
  let devicesService: { findOne: jest.Mock };
  let usersService: { findById: jest.Mock };

  beforeEach(async () => {
    prisma = {
      repairTicket: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
        update: jest.fn(),
      },
      ticketStatusHistory: { create: jest.fn() },
      $transaction: jest.fn().mockImplementation((arg: unknown) => {
        if (Array.isArray(arg)) {
          return Promise.all(arg as Promise<unknown>[]);
        }
        return (arg as (tx: unknown) => Promise<unknown>)(prisma);
      }),
    };

    customersService = { findOne: jest.fn().mockResolvedValue(mockCustomer) };
    devicesService = { findOne: jest.fn().mockResolvedValue(mockDevice) };
    usersService = { findById: jest.fn().mockResolvedValue(mockUser) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        { provide: PrismaService, useValue: prisma },
        { provide: CustomersService, useValue: customersService },
        { provide: DevicesService, useValue: devicesService },
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();

    service = module.get(TicketsService);
  });

  describe('findAll', () => {
    it('returns paginated tickets', async () => {
      prisma.repairTicket.findMany.mockResolvedValue([mockTicketRaw]);
      prisma.repairTicket.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({ page: 1, limit: 20, total: 1 });
      expect(result.data[0]!.ticketNumber).toBe('TKT-0001');
    });

    it('passes status filter when provided', async () => {
      prisma.repairTicket.findMany.mockResolvedValue([]);
      prisma.repairTicket.count.mockResolvedValue(0);

      await service.findAll({ status: TicketStatus.RECEIVED, page: 1, limit: 20 });

      const [args] = prisma.repairTicket.findMany.mock.calls;
      expect(args![0]!.where).toMatchObject({ status: TicketStatus.RECEIVED });
    });

    it('passes assignedToId filter when provided', async () => {
      prisma.repairTicket.findMany.mockResolvedValue([]);
      prisma.repairTicket.count.mockResolvedValue(0);

      await service.findAll({ assignedToId: 'user-1', page: 1, limit: 20 });

      const [args] = prisma.repairTicket.findMany.mock.calls;
      expect(args![0]!.where).toMatchObject({ assignedToId: 'user-1' });
    });

    it('builds search clause on ticketNumber and customer name', async () => {
      prisma.repairTicket.findMany.mockResolvedValue([]);
      prisma.repairTicket.count.mockResolvedValue(0);

      await service.findAll({ search: 'TKT', page: 1, limit: 20 });

      const [args] = prisma.repairTicket.findMany.mock.calls;
      expect(args![0]!.where).toMatchObject({
        OR: expect.arrayContaining([
          expect.objectContaining({ ticketNumber: expect.objectContaining({ contains: 'TKT' }) }),
        ]),
      });
    });

    it('returns empty results when no tickets match', async () => {
      prisma.repairTicket.findMany.mockResolvedValue([]);
      prisma.repairTicket.count.mockResolvedValue(0);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });
  });

  describe('findOne', () => {
    it('returns the ticket when found', async () => {
      prisma.repairTicket.findUnique.mockResolvedValue(mockTicketRaw);

      const result = await service.findOne('ticket-1');

      expect(result.id).toBe('ticket-1');
      expect(result.ticketNumber).toBe('TKT-0001');
    });

    it('throws NotFoundException when ticket does not exist', async () => {
      prisma.repairTicket.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    beforeEach(() => {
      prisma.repairTicket.create.mockResolvedValue({ id: 'ticket-1' });
      prisma.repairTicket.findUnique.mockResolvedValue(mockTicketRaw);
    });

    it('calls customersService.findOne to verify customer', async () => {
      await service.create(
        { customerId: 'cust-1', deviceId: 'dev-1', reportedProblem: 'Screen crack' },
        'user-1',
      );

      expect(customersService.findOne).toHaveBeenCalledWith('cust-1');
    });

    it('calls devicesService.findOne to verify device', async () => {
      await service.create(
        { customerId: 'cust-1', deviceId: 'dev-1', reportedProblem: 'Screen crack' },
        'user-1',
      );

      expect(devicesService.findOne).toHaveBeenCalledWith('dev-1');
    });

    it('throws BadRequestException when device does not belong to customer', async () => {
      devicesService.findOne.mockResolvedValue({ ...mockDevice, customerId: 'other-customer' });

      await expect(
        service.create(
          { customerId: 'cust-1', deviceId: 'dev-1', reportedProblem: 'Screen crack' },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates ticket with RECEIVED status and initial history entry', async () => {
      await service.create(
        { customerId: 'cust-1', deviceId: 'dev-1', reportedProblem: 'Screen crack' },
        'user-1',
      );

      expect(prisma.repairTicket.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ reportedProblem: 'Screen crack' }),
        }),
      );
      expect(prisma.ticketStatusHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            toStatus: TicketStatus.RECEIVED,
            fromStatus: null,
          }),
        }),
      );
    });
  });

  describe('update', () => {
    it('updates provided fields and returns updated ticket', async () => {
      prisma.repairTicket.findUnique.mockResolvedValue(mockTicketRaw);
      prisma.repairTicket.update.mockResolvedValue({ ...mockTicketRaw, diagnosis: 'Battery issue' });

      const result = await service.update('ticket-1', { diagnosis: 'Battery issue' });

      expect(prisma.repairTicket.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'ticket-1' } }),
      );
      expect(result.id).toBe('ticket-1');
    });

    it('throws NotFoundException when ticket does not exist', async () => {
      prisma.repairTicket.findUnique.mockResolvedValue(null);

      await expect(service.update('nonexistent', { diagnosis: 'test' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateStatus', () => {
    it('updates status on a valid transition RECEIVED → DIAGNOSING', async () => {
      prisma.repairTicket.findUnique.mockResolvedValue(mockTicketRaw);
      prisma.repairTicket.update.mockResolvedValue({ ...mockTicketRaw, status: TicketStatus.DIAGNOSING });

      await service.updateStatus(
        'ticket-1',
        { status: TicketStatus.DIAGNOSING },
        'user-1',
      );

      expect(prisma.repairTicket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ticket-1' },
          data: expect.objectContaining({ status: TicketStatus.DIAGNOSING }),
        }),
      );
      expect(prisma.ticketStatusHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            fromStatus: TicketStatus.RECEIVED,
            toStatus: TicketStatus.DIAGNOSING,
          }),
        }),
      );
    });

    it('sets completedAt when transitioning to DELIVERED', async () => {
      prisma.repairTicket.findUnique.mockResolvedValue({
        ...mockTicketRaw,
        status: TicketStatus.READY,
      });
      prisma.repairTicket.update.mockResolvedValue({
        ...mockTicketRaw,
        status: TicketStatus.DELIVERED,
      });

      await service.updateStatus(
        'ticket-1',
        { status: TicketStatus.DELIVERED },
        'user-1',
      );

      const updateCall = prisma.repairTicket.update.mock.calls[0]![0]!;
      expect(updateCall.data).toMatchObject({
        status: TicketStatus.DELIVERED,
        completedAt: expect.any(Date),
      });
    });

    it('sets completedAt when transitioning to CANCELLED', async () => {
      prisma.repairTicket.findUnique.mockResolvedValue(mockTicketRaw);
      prisma.repairTicket.update.mockResolvedValue({
        ...mockTicketRaw,
        status: TicketStatus.CANCELLED,
      });

      await service.updateStatus(
        'ticket-1',
        { status: TicketStatus.CANCELLED },
        'user-1',
      );

      const updateCall = prisma.repairTicket.update.mock.calls[0]![0]!;
      expect(updateCall.data).toMatchObject({
        completedAt: expect.any(Date),
      });
    });

    it('throws BadRequestException for invalid transition RECEIVED → DELIVERED', async () => {
      prisma.repairTicket.findUnique.mockResolvedValue(mockTicketRaw);

      await expect(
        service.updateStatus('ticket-1', { status: TicketStatus.DELIVERED }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when ticket does not exist', async () => {
      prisma.repairTicket.findUnique.mockResolvedValue(null);

      await expect(
        service.updateStatus('nonexistent', { status: TicketStatus.DIAGNOSING }, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('assignTechnician', () => {
    it('assigns a technician', async () => {
      prisma.repairTicket.findUnique.mockResolvedValue(mockTicketRaw);
      prisma.repairTicket.update.mockResolvedValue({ ...mockTicketRaw, assignedToId: 'user-1' });

      await service.assignTechnician('ticket-1', { assignedToId: 'user-1' });

      expect(prisma.repairTicket.update).toHaveBeenCalledWith({
        where: { id: 'ticket-1' },
        data: { assignedToId: 'user-1' },
      });
    });

    it('unassigns technician when assignedToId is not provided', async () => {
      prisma.repairTicket.findUnique.mockResolvedValue(mockTicketRaw);
      prisma.repairTicket.update.mockResolvedValue({ ...mockTicketRaw, assignedToId: null });

      await service.assignTechnician('ticket-1', {});

      expect(prisma.repairTicket.update).toHaveBeenCalledWith({
        where: { id: 'ticket-1' },
        data: { assignedToId: null },
      });
    });

    it('throws NotFoundException when ticket does not exist', async () => {
      prisma.repairTicket.findUnique.mockResolvedValue(null);

      await expect(service.assignTechnician('nonexistent', {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
