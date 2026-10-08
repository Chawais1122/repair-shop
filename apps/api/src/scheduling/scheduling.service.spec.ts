import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TimeOffStatus, UserRole } from '@repair-shop/shared';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { SchedulingService } from './scheduling.service';

const tech = { id: 'tech', email: 't@x', role: UserRole.TECHNICIAN };
const admin = { id: 'admin', email: 'a@x', role: UserRole.ADMIN };
const user = { id: 'tech', name: 'Tech', isActive: true };
const people = { user: { id: 'tech', name: 'Tech' }, createdBy: { id: 'admin', name: 'Admin' } };

function futureDay(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

describe('SchedulingService', () => {
  let service: SchedulingService;
  let users: { findOne: jest.Mock };
  let prisma: {
    shift: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      count: jest.Mock;
    };
    timeOffRequest: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    const echoShift = ({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({ id: 's1', notes: null, ...data, ...people });
    const echoTimeOff = ({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({
        id: 'to1',
        userId: 'tech',
        reason: null,
        status: TimeOffStatus.PENDING,
        reviewedAt: null,
        reviewNote: null,
        createdAt: new Date(),
        startDate: new Date('2030-01-01T00:00:00Z'),
        endDate: new Date('2030-01-03T00:00:00Z'),
        user: people.user,
        reviewedBy: null,
        ...data,
      });

    prisma = {
      shift: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn(),
        create: jest.fn().mockImplementation(echoShift),
        update: jest.fn().mockImplementation(echoShift),
        delete: jest.fn(),
        count: jest.fn().mockResolvedValue(2),
      },
      timeOffRequest: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn(),
        create: jest.fn().mockImplementation(echoTimeOff),
        update: jest.fn().mockImplementation(echoTimeOff),
      },
    };
    users = { findOne: jest.fn().mockResolvedValue(user) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchedulingService,
        { provide: PrismaService, useValue: prisma },
        { provide: UsersService, useValue: users },
      ],
    }).compile();
    service = module.get(SchedulingService);
  });

  const shift = {
    userId: 'tech',
    startsAt: '2030-01-07T09:00:00Z',
    endsAt: '2030-01-07T17:00:00Z',
  };

  describe('createShift', () => {
    it('creates a valid shift', async () => {
      const result = await service.createShift(shift, 'admin');
      expect(result.user.name).toBe('Tech');
      expect(prisma.shift.create.mock.calls[0][0].data.createdById).toBe('admin');
    });

    it('rejects shifts shorter than 15 minutes or longer than 16 hours', async () => {
      await expect(
        service.createShift({ ...shift, endsAt: '2030-01-07T09:10:00Z' }, 'admin'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.createShift({ ...shift, endsAt: '2030-01-08T03:00:00Z' }, 'admin'),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects double-booking the same employee', async () => {
      prisma.shift.findFirst.mockResolvedValue({ id: 'other' });
      await expect(service.createShift(shift, 'admin')).rejects.toThrow('already has a shift');
    });

    it('rejects scheduling over approved time off', async () => {
      prisma.timeOffRequest.findFirst.mockResolvedValue({ id: 'to' });
      await expect(service.createShift(shift, 'admin')).rejects.toThrow('approved time off');
    });

    it('rejects deactivated employees', async () => {
      users.findOne.mockResolvedValue({ ...user, isActive: false });
      await expect(service.createShift(shift, 'admin')).rejects.toThrow('deactivated');
    });
  });

  describe('updateShift', () => {
    it('moves a shift to another employee, excluding itself from the overlap check', async () => {
      prisma.shift.findUnique.mockResolvedValue({
        id: 's1',
        userId: 'tech',
        startsAt: new Date(shift.startsAt),
        endsAt: new Date(shift.endsAt),
      });
      await service.updateShift('s1', { userId: 'desk' });
      expect(prisma.shift.findFirst.mock.calls[0][0].where).toMatchObject({
        userId: 'desk',
        NOT: { id: 's1' },
      });
    });

    it('throws NotFoundException for unknown shifts', async () => {
      prisma.shift.findUnique.mockResolvedValue(null);
      await expect(service.updateShift('nope', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('copyWeek', () => {
    it('copies shifts a week later and skips clashes', async () => {
      prisma.shift.findMany.mockResolvedValue([
        {
          userId: 'tech',
          startsAt: new Date('2030-01-07T09:00:00Z'),
          endsAt: new Date('2030-01-07T17:00:00Z'),
          notes: null,
        },
        {
          userId: 'tech',
          startsAt: new Date('2030-01-08T09:00:00Z'),
          endsAt: new Date('2030-01-08T17:00:00Z'),
          notes: 'open',
        },
      ]);
      prisma.shift.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'clash' });

      const result = await service.copyWeek(
        { sourceWeekStart: '2030-01-07T00:00:00Z', targetWeekStart: '2030-01-14T00:00:00Z' },
        'admin',
      );

      expect(result).toEqual({ created: 1, skipped: 1 });
      expect(prisma.shift.create.mock.calls[0][0].data.startsAt).toEqual(
        new Date('2030-01-14T09:00:00Z'),
      );
    });
  });

  describe('time off', () => {
    it('lets staff request future time off', async () => {
      const result = await service.requestTimeOff(
        { startDate: futureDay(5), endDate: futureDay(7) },
        'tech',
      );
      expect(prisma.timeOffRequest.create.mock.calls[0][0].data.startDate).toEqual(
        new Date(`${futureDay(5)}T00:00:00.000Z`),
      );
      expect(result.status).toBe(TimeOffStatus.PENDING);
    });

    it('rejects past dates, reversed ranges and overlapping requests', async () => {
      await expect(
        service.requestTimeOff({ startDate: '2020-01-01', endDate: '2020-01-02' }, 'tech'),
      ).rejects.toThrow('past');
      await expect(
        service.requestTimeOff({ startDate: futureDay(5), endDate: futureDay(3) }, 'tech'),
      ).rejects.toThrow(BadRequestException);
      prisma.timeOffRequest.findFirst.mockResolvedValue({ id: 'x' });
      await expect(
        service.requestTimeOff({ startDate: futureDay(5), endDate: futureDay(6) }, 'tech'),
      ).rejects.toThrow('already have time off');
    });

    it('approves pending requests and reports shifts that need cover', async () => {
      prisma.timeOffRequest.findUnique.mockResolvedValue({
        id: 'to1',
        status: TimeOffStatus.PENDING,
      });
      const result = await service.reviewTimeOff(
        'to1',
        { status: TimeOffStatus.APPROVED },
        'admin',
      );
      expect(result.status).toBe(TimeOffStatus.APPROVED);
      expect(result.conflictingShifts).toBe(2);
      expect(result.days).toBe(3);
    });

    it('cannot review a request twice', async () => {
      prisma.timeOffRequest.findUnique.mockResolvedValue({
        id: 'to1',
        status: TimeOffStatus.DENIED,
      });
      await expect(
        service.reviewTimeOff('to1', { status: TimeOffStatus.APPROVED }, 'admin'),
      ).rejects.toThrow(BadRequestException);
    });

    it("stops staff cancelling someone else's request", async () => {
      prisma.timeOffRequest.findUnique.mockResolvedValue({
        id: 'to1',
        userId: 'desk',
        status: TimeOffStatus.PENDING,
      });
      await expect(service.cancelTimeOff('to1', tech)).rejects.toThrow(ForbiddenException);
      await expect(service.cancelTimeOff('to1', admin)).resolves.toBeDefined();
    });

    it('limits non-admins to their own private requests', async () => {
      await service.findTimeOff({ userId: 'desk' }, tech);
      expect(prisma.timeOffRequest.findMany.mock.calls[0][0].where.userId).toBe('tech');
      await service.findTimeOff({ status: TimeOffStatus.APPROVED }, tech);
      expect(prisma.timeOffRequest.findMany.mock.calls[1][0].where.userId).toBeUndefined();
    });
  });
});
