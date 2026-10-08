import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { UserRole } from '@repair-shop/shared';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';

const now = new Date();
const makeUser = (overrides: Record<string, unknown> = {}) => ({
  id: 'user-1',
  email: 'tech@shop.com',
  name: 'Tech',
  role: UserRole.TECHNICIAN,
  isActive: true,
  passwordHash: 'hash',
  phone: null,
  hourlyRate: new Prisma.Decimal('22.5'),
  monthlySalesTarget: null,
  createdAt: now,
  updatedAt: now,
  ...overrides,
});

describe('UsersService (staff management)', () => {
  let service: UsersService;
  let prisma: {
    user: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(makeUser()),
        findMany: jest.fn().mockResolvedValue([makeUser()]),
        count: jest.fn().mockResolvedValue(1),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve(makeUser(data))),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve(makeUser(data))),
      },
      $transaction: jest.fn().mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(UsersService);
  });

  it('never returns the password hash', async () => {
    const result = await service.findOne('user-1');
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('shows pay rates to admins only', async () => {
    const asAdmin = await service.findAll({ page: 1, limit: 20 }, UserRole.ADMIN);
    const asStaff = await service.findAll({ page: 1, limit: 20 }, UserRole.STAFF);
    expect(asAdmin.data[0]!.hourlyRate).toBe('22.50');
    expect(asStaff.data[0]!.hourlyRate).toBeNull();
  });

  describe('create', () => {
    it('hashes the password with bcrypt and normalises the email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await service.create({
        email: ' New@Shop.com ',
        name: 'New',
        password: 'longpassword',
        role: UserRole.STAFF,
      });
      const data = prisma.user.create.mock.calls[0][0].data;
      expect(data.email).toBe('new@shop.com');
      expect(await bcrypt.compare('longpassword', data.passwordHash)).toBe(true);
    });

    it('rejects duplicate emails', async () => {
      await expect(
        service.create({
          email: 'tech@shop.com',
          name: 'X',
          password: '12345678',
          role: UserRole.STAFF,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('stops admins from removing their own admin access', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser({ id: 'admin-1', role: UserRole.ADMIN }));
      await expect(service.update('admin-1', { isActive: false }, 'admin-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('keeps at least one active admin', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser({ id: 'admin-2', role: UserRole.ADMIN }));
      prisma.user.count.mockResolvedValue(0);
      await expect(service.update('admin-2', { role: UserRole.STAFF }, 'admin-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('clears optional fields with null', async () => {
      await service.update('user-1', { hourlyRate: null, phone: null }, 'admin-1');
      expect(prisma.user.update.mock.calls[0][0].data).toMatchObject({
        hourlyRate: null,
        phone: null,
      });
    });

    it('throws NotFoundException for unknown users', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.update('nope', { name: 'X' }, 'admin-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
