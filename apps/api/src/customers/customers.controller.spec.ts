import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { CustomerResponseDto } from './dto/customer-response.dto';
import { PaginatedResponse } from '@repair-shop/shared';

const now = new Date();
const mockCustomer: CustomerResponseDto = {
  id: 'cust-1',
  name: 'John Smith',
  phone: '+15551234567',
  email: 'john@example.com',
  address: '123 Main St',
  notes: null,
  createdAt: now,
  updatedAt: now,
};

const mockPaginated: PaginatedResponse<CustomerResponseDto> = {
  data: [mockCustomer],
  meta: { page: 1, limit: 20, total: 1 },
};

describe('CustomersController', () => {
  let controller: CustomersController;
  let service: jest.Mocked<CustomersService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomersController],
      providers: [
        {
          provide: CustomersService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get(CustomersController);
    service = module.get(CustomersService) as jest.Mocked<CustomersService>;
  });

  describe('findAll', () => {
    it('delegates to service and returns paginated result', async () => {
      service.findAll.mockResolvedValue(mockPaginated);

      const result = await controller.findAll({ page: 1, limit: 20 });

      expect(service.findAll).toHaveBeenCalledWith({ page: 1, limit: 20 });
      expect(result).toBe(mockPaginated);
    });
  });

  describe('findOne', () => {
    it('delegates to service with the correct id', async () => {
      service.findOne.mockResolvedValue(mockCustomer);

      const result = await controller.findOne('cust-1');

      expect(service.findOne).toHaveBeenCalledWith('cust-1');
      expect(result).toBe(mockCustomer);
    });
  });

  describe('create', () => {
    it('delegates to service and returns created customer', async () => {
      service.create.mockResolvedValue(mockCustomer);

      const result = await controller.create({
        name: 'John Smith',
        phone: '+15551234567',
      });

      expect(service.create).toHaveBeenCalledWith({
        name: 'John Smith',
        phone: '+15551234567',
      });
      expect(result).toBe(mockCustomer);
    });
  });

  describe('update', () => {
    it('delegates to service with id and dto', async () => {
      const updated = { ...mockCustomer, name: 'Jane Smith' };
      service.update.mockResolvedValue(updated);

      const result = await controller.update('cust-1', { name: 'Jane Smith' });

      expect(service.update).toHaveBeenCalledWith('cust-1', { name: 'Jane Smith' });
      expect(result).toBe(updated);
    });
  });

  describe('remove', () => {
    it('delegates to service with the correct id', async () => {
      service.remove.mockResolvedValue(undefined);

      await controller.remove('cust-1');

      expect(service.remove).toHaveBeenCalledWith('cust-1');
    });
  });
});
