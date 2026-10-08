import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { UserRole } from '@repair-shop/shared';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { TimeClockService } from './time-clock.service';

const user = { id: 'user-1', name: 'Tech' };
const admin = { id: 'admin-1', email: 'a@x', role: UserRole.ADMIN };
const tech = { id: 'user-1', email: 't@x', role: UserRole.TECHNICIAN };

describe('TimeClockService', () => {
  let service: TimeClockService;
  let prisma: {
    timeEntry: {
      findFirst: jest.Mock;
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
      timeEntry: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimeClockService,
        { provide: PrismaService, useValue: prisma },
        { provide: UsersService, useValue: { findOne: jest.fn().mockResolvedValue(user) } },
      ],
    }).compile();
    service = module.get(TimeClockService);
  });

  describe('clockIn', () => {
    it('opens a new entry', async () => {
      await service.clockIn('user-1');
      expect(prisma.timeEntry.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', clockIn: expect.any(Date), notes: null },
      });
    });

    it('maps the one-open-entry constraint to a friendly error', async () => {
      prisma.timeEntry.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: '5' }),
      );
      await expect(service.clockIn('user-1')).rejects.toThrow('You are already clocked in');
    });
  });

  describe('clockOut', () => {
    it('closes the open entry', async () => {
      prisma.timeEntry.findFirst.mockResolvedValueOnce({ id: 'e1', notes: null });
      await service.clockOut('user-1', 'done');
      expect(prisma.timeEntry.update).toHaveBeenCalledWith({
        where: { id: 'e1' },
        data: { clockOut: expect.any(Date), notes: 'done' },
      });
    });

    it('fails when not clocked in', async () => {
      await expect(service.clockOut('user-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getStatus', () => {
    it('sums today and this week, counting an open shift up to now', async () => {
      const now = new Date('2026-10-07T15:00:00'); // a Wednesday
      prisma.timeEntry.findMany.mockResolvedValue([
        // Monday, 8h
        { clockIn: new Date('2026-10-05T09:00:00'), clockOut: new Date('2026-10-05T17:00:00') },
        // Last Sunday — outside the week
        { clockIn: new Date('2026-10-04T09:00:00'), clockOut: new Date('2026-10-04T12:00:00') },
        // Today, still open: 2h so far
        { clockIn: new Date('2026-10-07T13:00:00'), clockOut: null },
      ]);
      prisma.timeEntry.findFirst.mockResolvedValue({
        id: 'open',
        clockIn: new Date('2026-10-07T13:00:00'),
        clockOut: null,
        notes: null,
        user,
        editedBy: null,
        createdAt: now,
      });

      const status = await service.getStatus('user-1', now);

      expect(status.clockedIn).toBe(true);
      expect(status.todayMinutes).toBe(120);
      expect(status.weekMinutes).toBe(600);
      expect(status.openEntry!.durationMinutes).toBe(120);
    });
  });

  describe('getTimesheet', () => {
    it('splits shifts that cross the range boundary', async () => {
      prisma.timeEntry.findMany.mockResolvedValue([
        {
          clockIn: new Date('2026-10-04T22:00:00Z'),
          clockOut: new Date('2026-10-05T02:00:00Z'),
          user,
        },
      ]);
      const rows = await service.getTimesheet(
        { from: '2026-10-05T00:00:00Z', to: '2026-10-12T00:00:00Z' },
        admin,
      );
      expect(rows).toEqual([{ user, totalMinutes: 120, entryCount: 1, openEntries: 0 }]);
    });

    it('restricts non-admins to their own time', async () => {
      await service.getTimesheet(
        { from: '2026-10-05T00:00:00Z', to: '2026-10-12T00:00:00Z', userId: 'someone-else' },
        tech,
      );
      expect(prisma.timeEntry.findMany.mock.calls[0][0].where.userId).toBe('user-1');
    });

    it('rejects ranges longer than 93 days', async () => {
      await expect(
        service.getTimesheet({ from: '2026-01-01T00:00:00Z', to: '2026-06-01T00:00:00Z' }, admin),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('createEntry', () => {
    it('rejects clock-out before clock-in', async () => {
      await expect(
        service.createEntry(
          { userId: 'user-1', clockIn: '2026-10-05T10:00:00Z', clockOut: '2026-10-05T09:00:00Z' },
          'admin-1',
        ),
      ).rejects.toThrow('Clock-out must be after clock-in');
    });

    it('rejects overlapping shifts', async () => {
      prisma.timeEntry.findFirst.mockResolvedValue({ id: 'other' });
      await expect(
        service.createEntry(
          { userId: 'user-1', clockIn: '2026-10-05T09:00:00Z', clockOut: '2026-10-05T17:00:00Z' },
          'admin-1',
        ),
      ).rejects.toThrow('overlaps');
    });

    it('records which admin made the entry', async () => {
      prisma.timeEntry.create.mockResolvedValue({
        id: 'e1',
        clockIn: new Date('2026-10-05T09:00:00Z'),
        clockOut: new Date('2026-10-05T17:00:00Z'),
        notes: null,
        user,
        editedBy: { id: 'admin-1', name: 'Admin' },
        createdAt: new Date(),
      });
      const result = await service.createEntry(
        { userId: 'user-1', clockIn: '2026-10-05T09:00:00Z', clockOut: '2026-10-05T17:00:00Z' },
        'admin-1',
      );
      expect(prisma.timeEntry.create.mock.calls[0][0].data.editedById).toBe('admin-1');
      expect(result.durationMinutes).toBe(480);
    });
  });

  describe('deleteEntry', () => {
    it('throws NotFoundException for unknown entries', async () => {
      prisma.timeEntry.findUnique.mockResolvedValue(null);
      await expect(service.deleteEntry('nope')).rejects.toThrow(NotFoundException);
    });
  });
});
