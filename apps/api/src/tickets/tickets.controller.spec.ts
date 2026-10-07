import { Test, TestingModule } from '@nestjs/testing';
import { Priority, TicketStatus } from '@repair-shop/shared';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';

const mockTicket = {
  id: 'ticket-1',
  ticketNumber: 'TKT-0001',
  status: TicketStatus.RECEIVED,
  priority: Priority.NORMAL,
  reportedProblem: 'Screen cracked',
  diagnosis: null,
  estimatedCost: null,
  finalCost: null,
  receivedAt: new Date(),
  expectedCompletionAt: null,
  completedAt: null,
  customer: { id: 'cust-1', name: 'John Smith', phone: '+15551234567' },
  device: { id: 'dev-1', brand: 'Apple', model: 'iPhone', type: 'PHONE' },
  assignedTo: null,
  createdBy: { id: 'user-1', name: 'Admin' },
  statusHistory: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockUser = { id: 'user-1', email: 'admin@shop.com', role: 'ADMIN' };

describe('TicketsController', () => {
  let controller: TicketsController;
  let service: {
    findAll: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    updateStatus: jest.Mock;
    assignTechnician: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateStatus: jest.fn(),
      assignTechnician: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TicketsController],
      providers: [{ provide: TicketsService, useValue: service }],
    }).compile();

    controller = module.get(TicketsController);
  });

  it('findAll delegates to service', async () => {
    const paginated = { data: [mockTicket], meta: { page: 1, limit: 20, total: 1 } };
    service.findAll.mockResolvedValue(paginated);

    const result = await controller.findAll({ page: 1, limit: 20 });

    expect(service.findAll).toHaveBeenCalledWith({ page: 1, limit: 20 });
    expect(result).toBe(paginated);
  });

  it('findOne delegates to service', async () => {
    service.findOne.mockResolvedValue(mockTicket);

    const result = await controller.findOne('ticket-1');

    expect(service.findOne).toHaveBeenCalledWith('ticket-1');
    expect(result).toBe(mockTicket);
  });

  it('create delegates to service with current user id', async () => {
    service.create.mockResolvedValue(mockTicket);
    const dto = { customerId: 'cust-1', deviceId: 'dev-1', reportedProblem: 'Crack' };

    const result = await controller.create(dto as never, mockUser as never);

    expect(service.create).toHaveBeenCalledWith(dto, 'user-1');
    expect(result).toBe(mockTicket);
  });

  it('update delegates to service', async () => {
    service.update.mockResolvedValue(mockTicket);
    const dto = { diagnosis: 'Battery worn out' };

    const result = await controller.update('ticket-1', dto);

    expect(service.update).toHaveBeenCalledWith('ticket-1', dto);
    expect(result).toBe(mockTicket);
  });

  it('updateStatus delegates to service with current user id', async () => {
    service.updateStatus.mockResolvedValue(mockTicket);
    const dto = { status: TicketStatus.DIAGNOSING };

    const result = await controller.updateStatus('ticket-1', dto, mockUser as never);

    expect(service.updateStatus).toHaveBeenCalledWith('ticket-1', dto, 'user-1');
    expect(result).toBe(mockTicket);
  });

  it('assignTechnician delegates to service', async () => {
    service.assignTechnician.mockResolvedValue(mockTicket);
    const dto = { assignedToId: 'user-1' };

    const result = await controller.assignTechnician('ticket-1', dto);

    expect(service.assignTechnician).toHaveBeenCalledWith('ticket-1', dto);
    expect(result).toBe(mockTicket);
  });
});
