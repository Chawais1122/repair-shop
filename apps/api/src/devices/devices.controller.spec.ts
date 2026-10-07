import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { DeviceType } from '@repair-shop/shared';
import { CustomerDevicesController } from './customer-devices.controller';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';
import { DeviceResponseDto } from './dto/device-response.dto';
import { PaginatedResponse } from '@repair-shop/shared';

const now = new Date();

const mockDevice: DeviceResponseDto = {
  id: 'dev-1',
  customerId: 'cust-1',
  type: DeviceType.PHONE,
  brand: 'Apple',
  model: 'iPhone 15',
  serialNumber: 'SN123',
  imei: null,
  hasPasscode: true,
  notes: null,
  createdAt: now,
  updatedAt: now,
};

const mockPaginated: PaginatedResponse<DeviceResponseDto> = {
  data: [mockDevice],
  meta: { page: 1, limit: 20, total: 1 },
};

describe('CustomerDevicesController', () => {
  let controller: CustomerDevicesController;
  let service: jest.Mocked<DevicesService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomerDevicesController],
      providers: [
        {
          provide: DevicesService,
          useValue: { findAll: jest.fn(), create: jest.fn() },
        },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get(CustomerDevicesController);
    service = module.get(DevicesService) as jest.Mocked<DevicesService>;
  });

  it('findAll delegates to service', async () => {
    service.findAll.mockResolvedValue(mockPaginated);

    const result = await controller.findAll('cust-1', { page: 1, limit: 20 });

    expect(service.findAll).toHaveBeenCalledWith('cust-1', { page: 1, limit: 20 });
    expect(result).toBe(mockPaginated);
  });

  it('create delegates to service', async () => {
    service.create.mockResolvedValue(mockDevice);

    const dto = { type: DeviceType.PHONE, brand: 'Apple', model: 'iPhone 15' };
    const result = await controller.create('cust-1', dto);

    expect(service.create).toHaveBeenCalledWith('cust-1', dto);
    expect(result).toBe(mockDevice);
  });
});

describe('DevicesController', () => {
  let controller: DevicesController;
  let service: jest.Mocked<DevicesService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DevicesController],
      providers: [
        {
          provide: DevicesService,
          useValue: { findOne: jest.fn(), update: jest.fn(), remove: jest.fn() },
        },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get(DevicesController);
    service = module.get(DevicesService) as jest.Mocked<DevicesService>;
  });

  it('findOne delegates to service', async () => {
    service.findOne.mockResolvedValue(mockDevice);

    const result = await controller.findOne('dev-1');

    expect(service.findOne).toHaveBeenCalledWith('dev-1');
    expect(result).toBe(mockDevice);
  });

  it('update delegates to service', async () => {
    const updated = { ...mockDevice, brand: 'Samsung' };
    service.update.mockResolvedValue(updated);

    const result = await controller.update('dev-1', { brand: 'Samsung' });

    expect(service.update).toHaveBeenCalledWith('dev-1', { brand: 'Samsung' });
    expect(result).toBe(updated);
  });

  it('remove delegates to service', async () => {
    service.remove.mockResolvedValue(undefined);

    await controller.remove('dev-1');

    expect(service.remove).toHaveBeenCalledWith('dev-1');
  });
});
