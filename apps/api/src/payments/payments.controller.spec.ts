import { Test, TestingModule } from '@nestjs/testing';
import { PaymentMethod, PaymentStatus } from '@repair-shop/shared';
import { PaymentsController } from './payments.controller';
import { TicketPaymentsController } from './ticket-payments.controller';
import { PaymentsService } from './payments.service';

const mockService = {
  getSummary: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
};

const summaryStub = {
  totalCost: '100',
  paidAmount: '50',
  remainingAmount: '50',
  isFullyPaid: false,
  payments: [],
};

const paymentStub = {
  id: 'pay-1',
  ticketId: 'ticket-1',
  amount: '50',
  method: PaymentMethod.CASH,
  status: PaymentStatus.COMPLETED,
  transactionId: null,
  paidAt: new Date().toISOString(),
  notes: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('TicketPaymentsController', () => {
  let controller: TicketPaymentsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TicketPaymentsController],
      providers: [{ provide: PaymentsService, useValue: mockService }],
    }).compile();

    controller = module.get(TicketPaymentsController);
    jest.clearAllMocks();
  });

  it('getSummary delegates to service', async () => {
    mockService.getSummary.mockResolvedValue(summaryStub);

    const result = await controller.getSummary('ticket-1');

    expect(mockService.getSummary).toHaveBeenCalledWith('ticket-1');
    expect(result).toBe(summaryStub);
  });

  it('create delegates to service', async () => {
    mockService.create.mockResolvedValue(paymentStub);
    const dto = { amount: 50, method: PaymentMethod.CASH, status: PaymentStatus.COMPLETED };

    const result = await controller.create('ticket-1', dto);

    expect(mockService.create).toHaveBeenCalledWith('ticket-1', dto);
    expect(result).toBe(paymentStub);
  });
});

describe('PaymentsController', () => {
  let controller: PaymentsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [{ provide: PaymentsService, useValue: mockService }],
    }).compile();

    controller = module.get(PaymentsController);
    jest.clearAllMocks();
  });

  it('update delegates to service', async () => {
    mockService.update.mockResolvedValue(paymentStub);
    const dto = { status: PaymentStatus.COMPLETED };

    const result = await controller.update('pay-1', dto);

    expect(mockService.update).toHaveBeenCalledWith('pay-1', dto);
    expect(result).toBe(paymentStub);
  });
});
