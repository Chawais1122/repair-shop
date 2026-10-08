import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaginatedResponse, UserRole } from '@repair-shop/shared';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import {
  ClockStatusDto,
  TimeEntryResponseDto,
  TimesheetRowDto,
} from './dto/time-entry-response.dto';
import {
  CreateTimeEntryDto,
  FindTimeEntriesQueryDto,
  TimesheetQueryDto,
  UpdateTimeEntryDto,
} from './dto/time-entry.dto';

const ENTRY_INCLUDE = {
  user: { select: { id: true, name: true } },
  editedBy: { select: { id: true, name: true } },
} as const;

type EntryRow = Prisma.TimeEntryGetPayload<{ include: typeof ENTRY_INCLUDE }>;

const MAX_RANGE_DAYS = 93;
const MAX_SHIFT_HOURS = 24;

function minutesBetween(start: Date, end: Date): number {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60_000));
}

/** Minutes of [start, end) that fall inside [from, to). */
function overlapMinutes(start: Date, end: Date, from: Date, to: Date): number {
  const s = Math.max(start.getTime(), from.getTime());
  const e = Math.min(end.getTime(), to.getTime());
  return e > s ? Math.round((e - s) / 60_000) : 0;
}

@Injectable()
export class TimeClockService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async getStatus(userId: string, now = new Date()): Promise<ClockStatusDto> {
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(startOfDay);
    // Weeks start on Monday
    startOfWeek.setDate(startOfWeek.getDate() - ((startOfWeek.getDay() + 6) % 7));

    const [open, weekEntries] = await Promise.all([
      this.prisma.timeEntry.findFirst({
        where: { userId, clockOut: null },
        include: ENTRY_INCLUDE,
      }),
      this.prisma.timeEntry.findMany({
        where: {
          userId,
          clockIn: { lt: now },
          OR: [{ clockOut: null }, { clockOut: { gt: startOfWeek } }],
        },
        select: { clockIn: true, clockOut: true },
      }),
    ]);

    const sum = (from: Date): number =>
      weekEntries.reduce((t, e) => t + overlapMinutes(e.clockIn, e.clockOut ?? now, from, now), 0);

    return {
      clockedIn: open !== null,
      openEntry: open ? this.toResponseDto(open, now) : null,
      todayMinutes: sum(startOfDay),
      weekMinutes: sum(startOfWeek),
    };
  }

  async clockIn(userId: string, notes?: string): Promise<ClockStatusDto> {
    try {
      await this.prisma.timeEntry.create({
        data: { userId, clockIn: new Date(), notes: notes ?? null },
      });
    } catch (err) {
      // Partial unique index: one open entry per user
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new BadRequestException('You are already clocked in');
      }
      throw err;
    }
    return this.getStatus(userId);
  }

  async clockOut(userId: string, notes?: string): Promise<ClockStatusDto> {
    const open = await this.prisma.timeEntry.findFirst({
      where: { userId, clockOut: null },
      select: { id: true, notes: true },
    });
    if (!open) throw new BadRequestException('You are not clocked in');

    await this.prisma.timeEntry.update({
      where: { id: open.id },
      data: {
        clockOut: new Date(),
        ...(notes && { notes: open.notes ? `${open.notes}\n${notes}` : notes }),
      },
    });
    return this.getStatus(userId);
  }

  async findEntries(
    query: FindTimeEntriesQueryDto,
    viewer: AuthenticatedUser,
  ): Promise<PaginatedResponse<TimeEntryResponseDto>> {
    const { from, to, page = 1, limit = 20 } = query;
    const userId = this.scopeUser(query.userId, viewer);

    const where: Prisma.TimeEntryWhereInput = {
      ...(userId && { userId }),
      ...((from || to) && {
        clockIn: { ...(from && { gte: new Date(from) }), ...(to && { lt: new Date(to) }) },
      }),
    };

    const [entries, total] = await this.prisma.$transaction([
      this.prisma.timeEntry.findMany({
        where,
        include: ENTRY_INCLUDE,
        orderBy: { clockIn: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.timeEntry.count({ where }),
    ]);

    const now = new Date();
    return { data: entries.map((e) => this.toResponseDto(e, now)), meta: { page, limit, total } };
  }

  /** Hours per employee in a date range; shifts crossing the boundary are split. */
  async getTimesheet(
    query: TimesheetQueryDto,
    viewer: AuthenticatedUser,
  ): Promise<TimesheetRowDto[]> {
    const { from, to } = this.parseRange(query.from, query.to);
    const userId = this.scopeUser(query.userId, viewer);
    const minutes = await this.minutesByUser(from, to, userId);
    return [...minutes.values()].sort((a, b) => a.user.name.localeCompare(b.user.name));
  }

  /** Used by reports: worked minutes per user id in a range. */
  async getWorkedMinutesByUser(from: Date, to: Date): Promise<Map<string, number>> {
    const rows = await this.minutesByUser(from, to);
    return new Map([...rows.entries()].map(([id, r]) => [id, r.totalMinutes]));
  }

  async createEntry(dto: CreateTimeEntryDto, adminId: string): Promise<TimeEntryResponseDto> {
    await this.usersService.findOne(dto.userId);
    const clockIn = new Date(dto.clockIn);
    const clockOut = dto.clockOut ? new Date(dto.clockOut) : null;
    this.assertValidShift(clockIn, clockOut);
    await this.assertNoOverlap(dto.userId, clockIn, clockOut);

    try {
      const entry = await this.prisma.timeEntry.create({
        data: {
          userId: dto.userId,
          clockIn,
          clockOut,
          notes: dto.notes ?? null,
          editedById: adminId,
        },
        include: ENTRY_INCLUDE,
      });
      return this.toResponseDto(entry, new Date());
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new BadRequestException('This employee already has an open shift');
      }
      throw err;
    }
  }

  async updateEntry(
    id: string,
    dto: UpdateTimeEntryDto,
    adminId: string,
  ): Promise<TimeEntryResponseDto> {
    const existing = await this.prisma.timeEntry.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Time entry ${id} not found`);

    const clockIn = dto.clockIn ? new Date(dto.clockIn) : existing.clockIn;
    const clockOut =
      dto.clockOut === undefined ? existing.clockOut : dto.clockOut ? new Date(dto.clockOut) : null;
    this.assertValidShift(clockIn, clockOut);
    await this.assertNoOverlap(existing.userId, clockIn, clockOut, id);

    try {
      const entry = await this.prisma.timeEntry.update({
        where: { id },
        data: {
          clockIn,
          clockOut,
          ...(dto.notes !== undefined && { notes: dto.notes || null }),
          editedById: adminId,
        },
        include: ENTRY_INCLUDE,
      });
      return this.toResponseDto(entry, new Date());
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new BadRequestException('This employee already has an open shift');
      }
      throw err;
    }
  }

  async deleteEntry(id: string): Promise<void> {
    const existing = await this.prisma.timeEntry.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException(`Time entry ${id} not found`);
    await this.prisma.timeEntry.delete({ where: { id } });
  }

  /** Non-admins can only see their own time. */
  private scopeUser(requested: string | undefined, viewer: AuthenticatedUser): string | undefined {
    return viewer.role === UserRole.ADMIN ? requested : viewer.id;
  }

  private parseRange(fromStr: string, toStr: string): { from: Date; to: Date } {
    const from = new Date(fromStr);
    const to = new Date(toStr);
    if (to <= from) throw new BadRequestException('"to" must be after "from"');
    if (to.getTime() - from.getTime() > MAX_RANGE_DAYS * 86_400_000) {
      throw new BadRequestException(`Date range cannot exceed ${MAX_RANGE_DAYS} days`);
    }
    return { from, to };
  }

  private async minutesByUser(
    from: Date,
    to: Date,
    userId?: string,
  ): Promise<Map<string, TimesheetRowDto>> {
    const now = new Date();
    const entries = await this.prisma.timeEntry.findMany({
      where: {
        ...(userId && { userId }),
        clockIn: { lt: to },
        OR: [{ clockOut: null }, { clockOut: { gt: from } }],
      },
      select: {
        clockIn: true,
        clockOut: true,
        user: { select: { id: true, name: true } },
      },
    });

    const rows = new Map<string, TimesheetRowDto>();
    for (const e of entries) {
      const row = rows.get(e.user.id) ?? {
        user: e.user,
        totalMinutes: 0,
        entryCount: 0,
        openEntries: 0,
      };
      row.totalMinutes += overlapMinutes(e.clockIn, e.clockOut ?? now, from, to);
      row.entryCount += 1;
      if (!e.clockOut) row.openEntries += 1;
      rows.set(e.user.id, row);
    }
    return rows;
  }

  private assertValidShift(clockIn: Date, clockOut: Date | null): void {
    if (clockIn > new Date()) throw new BadRequestException('Clock-in cannot be in the future');
    if (!clockOut) return;
    if (clockOut <= clockIn) throw new BadRequestException('Clock-out must be after clock-in');
    if (clockOut.getTime() - clockIn.getTime() > MAX_SHIFT_HOURS * 3_600_000) {
      throw new BadRequestException(`A shift cannot be longer than ${MAX_SHIFT_HOURS} hours`);
    }
  }

  private async assertNoOverlap(
    userId: string,
    clockIn: Date,
    clockOut: Date | null,
    excludeId?: string,
  ): Promise<void> {
    const end = clockOut ?? new Date('9999-12-31');
    const clash = await this.prisma.timeEntry.findFirst({
      where: {
        userId,
        ...(excludeId && { NOT: { id: excludeId } }),
        clockIn: { lt: end },
        OR: [{ clockOut: null }, { clockOut: { gt: clockIn } }],
      },
      select: { id: true },
    });
    if (clash) throw new BadRequestException('This shift overlaps another time entry');
  }

  private toResponseDto(entry: EntryRow, now: Date): TimeEntryResponseDto {
    return {
      id: entry.id,
      user: entry.user,
      clockIn: entry.clockIn,
      clockOut: entry.clockOut,
      durationMinutes: minutesBetween(entry.clockIn, entry.clockOut ?? now),
      notes: entry.notes,
      editedBy: entry.editedBy,
      createdAt: entry.createdAt,
    };
  }
}
