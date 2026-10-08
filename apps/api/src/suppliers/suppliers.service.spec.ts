import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SuppliersService } from './suppliers.service';

const now = new Date();
const mockSupplier = {
  id: 'sup-1',
  name: 'MobileSentrix',
  contactName: null,
  email: 'orders@example.com',
  phone: null,
  website: null,
  notes: null,
  createdAt: now,
  updatedAt: now,
};

describe('SuppliersService', () => {
  let service: SuppliersService;
  let prisma: {
    supplier: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      supplier: {
        findMany: jest.fn().mockResolvedValue([mockSupplier]),
        findUnique: jest.fn().mockResolvedValue(mockSupplier),
        count: jest.fn().mockResolvedValue(1),
        create: jest.fn().mockResolvedValue(mockSupplier),
        update: jest.fn().mockResolvedValue(mockSupplier),
        delete: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [SuppliersService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(SuppliersService);
  });

  it('lists suppliers with pagination meta', async () => {
    const result = await service.findAll({ page: 1, limit: 20 });
    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
  });

  it('throws NotFoundException for an unknown supplier', async () => {
    prisma.supplier.findUnique.mockResolvedValue(null);
    await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
  });

  it('refuses to delete a supplier referenced by purchase orders', async () => {
    prisma.supplier.delete.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('fk', { code: 'P2003', clientVersion: '5' }),
    );
    await expect(service.remove('sup-1')).rejects.toThrow(BadRequestException);
  });
});
