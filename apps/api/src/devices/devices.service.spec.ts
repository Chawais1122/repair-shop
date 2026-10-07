import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { DeviceType } from '@repair-shop/shared';
import { EncryptionService } from '../common/services/encryption.service';
import { CustomersService } from '../customers/customers.service';
import { PrismaService } from '../prisma/prisma.service';
import { DevicesService } from './devices.service';

const now = new Date();

const mockDevice = {
  id: 'dev-1',
  customerId: 'cust-1',
  type: DeviceType.PHONE,
  brand: 'Apple',
  model: 'iPhone 15',
  serialNumber: 'SN123',
  imei: null,
  passcode: 'enc:1234',
  notes: null,
  createdAt: now,
  updatedAt: now,
};

const mockCustomer = {
  id: 'cust-1',
  name: 'John',
  phone: '+1555',
  email: null,
  address: null,
  notes: null,
  createdAt: now,
  updatedAt: now,
};

describe('DevicesService', () => {
  let service: DevicesService;
  let prisma: {
    device: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let customersService: { findOne: jest.Mock };
  let encryptionService: { encrypt: jest.Mock; decrypt: jest.Mock };

  beforeEach(async () => {
    prisma = {
      device: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    customersService = { findOne: jest.fn().mockResolvedValue(mockCustomer) };

    encryptionService = {
      encrypt: jest.fn((v: string) => `enc:${v}`),
      decrypt: jest.fn((v: string) => v.replace('enc:', '')),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DevicesService,
        { provide: PrismaService, useValue: prisma },
        { provide: CustomersService, useValue: customersService },
        { provide: EncryptionService, useValue: encryptionService },
      ],
    }).compile();

    service = module.get(DevicesService);
  });

  describe('findAll', () => {
    it('returns paginated devices for a customer', async () => {
      prisma.$transaction.mockResolvedValue([[mockDevice], 1]);

      const result = await service.findAll('cust-1', { page: 1, limit: 20 });

      expect(customersService.findOne).toHaveBeenCalledWith('cust-1');
      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({ page: 1, limit: 20, total: 1 });
      expect(result.data[0]!.id).toBe('dev-1');
      expect(result.data[0]!.hasPasscode).toBe(true);
    });

    it('passes search where clause to findMany', async () => {
      prisma.$transaction.mockResolvedValue([[], 0]);

      await service.findAll('cust-1', { search: 'apple', page: 1, limit: 20 });

      const [findManyArgs] = prisma.device.findMany.mock.calls;
      expect(findManyArgs![0]!.where).toMatchObject({
        OR: expect.arrayContaining([
          expect.objectContaining({ brand: expect.objectContaining({ contains: 'apple' }) }),
        ]),
      });
    });

    it('throws NotFoundException when customer does not exist', async () => {
      customersService.findOne.mockRejectedValue(new NotFoundException('Customer not found'));

      await expect(service.findAll('nonexistent', { page: 1, limit: 20 })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findOne', () => {
    it('returns the device when found', async () => {
      prisma.device.findUnique.mockResolvedValue(mockDevice);

      const result = await service.findOne('dev-1');

      expect(result.id).toBe('dev-1');
      expect(result.brand).toBe('Apple');
      expect(result.hasPasscode).toBe(true);
    });

    it('does not expose the raw passcode in response', async () => {
      prisma.device.findUnique.mockResolvedValue(mockDevice);

      const result = await service.findOne('dev-1');

      expect(result).not.toHaveProperty('passcode');
    });

    it('throws NotFoundException when device does not exist', async () => {
      prisma.device.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('creates a device and returns the response', async () => {
      prisma.device.create.mockResolvedValue(mockDevice);

      const result = await service.create('cust-1', {
        type: DeviceType.PHONE,
        brand: 'Apple',
        model: 'iPhone 15',
        passcode: '1234',
      });

      expect(customersService.findOne).toHaveBeenCalledWith('cust-1');
      expect(result.brand).toBe('Apple');
    });

    it('encrypts passcode when provided', async () => {
      prisma.device.create.mockResolvedValue(mockDevice);

      await service.create('cust-1', {
        type: DeviceType.PHONE,
        brand: 'Apple',
        model: 'iPhone 15',
        passcode: '1234',
      });

      expect(encryptionService.encrypt).toHaveBeenCalledWith('1234');
      expect(prisma.device.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ passcode: 'enc:1234' }),
      });
    });

    it('stores null passcode when passcode is not provided', async () => {
      prisma.device.create.mockResolvedValue({ ...mockDevice, passcode: null });

      await service.create('cust-1', {
        type: DeviceType.PHONE,
        brand: 'Apple',
        model: 'iPhone 15',
      });

      expect(encryptionService.encrypt).not.toHaveBeenCalled();
      expect(prisma.device.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ passcode: null }),
      });
    });
  });

  describe('update', () => {
    it('updates and returns the device', async () => {
      prisma.device.findUnique.mockResolvedValue(mockDevice);
      prisma.device.update.mockResolvedValue({ ...mockDevice, brand: 'Samsung' });

      const result = await service.update('dev-1', { brand: 'Samsung' });

      expect(result.brand).toBe('Samsung');
    });

    it('throws NotFoundException when device does not exist', async () => {
      prisma.device.findUnique.mockResolvedValue(null);

      await expect(service.update('nonexistent', { brand: 'X' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('encrypts the new passcode on update', async () => {
      prisma.device.findUnique.mockResolvedValue(mockDevice);
      prisma.device.update.mockResolvedValue(mockDevice);

      await service.update('dev-1', { passcode: 'newpass' });

      expect(encryptionService.encrypt).toHaveBeenCalledWith('newpass');
      expect(prisma.device.update).toHaveBeenCalledWith({
        where: { id: 'dev-1' },
        data: expect.objectContaining({ passcode: 'enc:newpass' }),
      });
    });

    it('clears passcode when empty string is provided', async () => {
      prisma.device.findUnique.mockResolvedValue(mockDevice);
      prisma.device.update.mockResolvedValue({ ...mockDevice, passcode: null });

      await service.update('dev-1', { passcode: '' });

      expect(encryptionService.encrypt).not.toHaveBeenCalled();
      expect(prisma.device.update).toHaveBeenCalledWith({
        where: { id: 'dev-1' },
        data: expect.objectContaining({ passcode: null }),
      });
    });

    it('does not touch passcode when passcode is undefined', async () => {
      prisma.device.findUnique.mockResolvedValue(mockDevice);
      prisma.device.update.mockResolvedValue(mockDevice);

      await service.update('dev-1', { brand: 'Samsung' });

      expect(encryptionService.encrypt).not.toHaveBeenCalled();
      const updateCall = prisma.device.update.mock.calls[0]![0];
      expect(updateCall.data).not.toHaveProperty('passcode');
    });
  });

  describe('remove', () => {
    it('deletes the device successfully', async () => {
      prisma.device.findUnique.mockResolvedValue(mockDevice);
      prisma.device.delete.mockResolvedValue(mockDevice);

      await expect(service.remove('dev-1')).resolves.toBeUndefined();
    });

    it('throws NotFoundException when device does not exist', async () => {
      prisma.device.findUnique.mockResolvedValue(null);

      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when device has repair tickets (FK constraint)', async () => {
      prisma.device.findUnique.mockResolvedValue(mockDevice);
      const fkError = new Prisma.PrismaClientKnownRequestError('FK violation', {
        code: 'P2003',
        clientVersion: '5.0.0',
      });
      prisma.device.delete.mockRejectedValue(fkError);

      await expect(service.remove('dev-1')).rejects.toThrow(BadRequestException);
    });
  });
});
