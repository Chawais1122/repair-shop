import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { CustomersService } from './customers.service';
import { PrismaService } from '../prisma/prisma.service';

const now = new Date();
const mockCustomer = {
  id: 'cust-1',
  name: 'John Smith',
  phone: '+15551234567',
  email: 'john@example.com',
  address: '123 Main St',
  notes: null,
  createdAt: now,
  updatedAt: now,
};

describe('CustomersService', () => {
  let service: CustomersService;
  let prisma: {
    customer: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      customer: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(CustomersService);
  });

  describe('findAll', () => {
    it('returns paginated customers', async () => {
      prisma.$transaction.mockResolvedValue([[mockCustomer], 1]);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({ page: 1, limit: 20, total: 1 });
      expect(result.data[0]!.id).toBe('cust-1');
    });

    it('passes a search where clause to findMany when search is provided', async () => {
      prisma.$transaction.mockResolvedValue([[], 0]);

      await service.findAll({ search: 'john', page: 1, limit: 20 });

      const [findManyArgs] = prisma.customer.findMany.mock.calls;
      expect(findManyArgs![0]!.where).toMatchObject({
        OR: expect.arrayContaining([
          expect.objectContaining({ name: expect.objectContaining({ contains: 'john' }) }),
        ]),
      });
    });

    it('returns empty results when no customers match', async () => {
      prisma.$transaction.mockResolvedValue([[], 0]);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });
  });

  describe('findOne', () => {
    it('returns the customer when found', async () => {
      prisma.customer.findUnique.mockResolvedValue(mockCustomer);

      const result = await service.findOne('cust-1');

      expect(result.id).toBe('cust-1');
      expect(result.name).toBe('John Smith');
    });

    it('throws NotFoundException when customer does not exist', async () => {
      prisma.customer.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('creates and returns a new customer', async () => {
      prisma.customer.findUnique.mockResolvedValue(null);
      prisma.customer.create.mockResolvedValue(mockCustomer);

      const result = await service.create({
        name: 'John Smith',
        phone: '+15551234567',
        email: 'john@example.com',
      });

      expect(result.name).toBe('John Smith');
      expect(prisma.customer.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ name: 'John Smith', phone: '+15551234567' }),
      });
    });

    it('throws ConflictException when phone already exists', async () => {
      prisma.customer.findUnique.mockResolvedValue(mockCustomer);

      await expect(
        service.create({ name: 'Other', phone: '+15551234567' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('updates and returns the customer', async () => {
      prisma.customer.findUnique.mockResolvedValue(mockCustomer);
      prisma.customer.findFirst.mockResolvedValue(null);
      prisma.customer.update.mockResolvedValue({ ...mockCustomer, name: 'Jane Smith' });

      const result = await service.update('cust-1', { name: 'Jane Smith' });

      expect(result.name).toBe('Jane Smith');
    });

    it('throws NotFoundException when customer does not exist', async () => {
      prisma.customer.findUnique.mockResolvedValue(null);

      await expect(service.update('nonexistent', { name: 'X' })).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when new phone already belongs to another customer', async () => {
      prisma.customer.findUnique.mockResolvedValue(mockCustomer);
      prisma.customer.findFirst.mockResolvedValue({ ...mockCustomer, id: 'cust-2' });

      await expect(
        service.update('cust-1', { phone: '+15559999999' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('deletes the customer successfully', async () => {
      prisma.customer.findUnique.mockResolvedValue(mockCustomer);
      prisma.customer.delete.mockResolvedValue(mockCustomer);

      await expect(service.remove('cust-1')).resolves.toBeUndefined();
    });

    it('throws NotFoundException when customer does not exist', async () => {
      prisma.customer.findUnique.mockResolvedValue(null);

      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when customer has repair tickets (FK constraint)', async () => {
      prisma.customer.findUnique.mockResolvedValue(mockCustomer);
      const fkError = new Prisma.PrismaClientKnownRequestError('FK violation', {
        code: 'P2003',
        clientVersion: '5.0.0',
      });
      prisma.customer.delete.mockRejectedValue(fkError);

      await expect(service.remove('cust-1')).rejects.toThrow(BadRequestException);
    });
  });
});
