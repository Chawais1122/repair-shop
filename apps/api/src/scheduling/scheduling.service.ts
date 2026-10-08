import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TimeOffStatus, UserRole } from '@repair-shop/shared';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { dayKey } from '../common/utils/date-range';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import {
  CopyWeekDto,
  CreateShiftDto,
  FindShiftsQueryDto,
  ShiftResponseDto,
  UpdateShiftDto,
} from './dto/shift.dto';
import {
  FindTimeOffQueryDto,
  RequestTimeOffDto,
  ReviewTimeOffDto,
  TimeOffResponseDto,
} from './dto/time-off.dto';

const SHIFT_INCLUDE = {
  user: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
} as const;

const TIME_OFF_INCLUDE = {
  user: { select: { id: true, name: true } },
  reviewedBy: { select: { id: true, name: true } },
} as const;

type ShiftRow = Prisma.ShiftGetPayload<{ include: typeof SHIFT_INCLUDE }>;
type TimeOffRow = Prisma.TimeOffRequestGetPayload<{ include: typeof TIME_OFF_INCLUDE }>;

const MIN_SHIFT_MINUTES = 15;
const MAX_SHIFT_HOURS = 16;
const MAX_QUERY_DAYS = 62;
const MAX_TIME_OFF_DAYS = 60;
const DAY_MS = 86_400_000;

/** @db.Date values come back as UTC midnight; this is the calendar day they represent. */
const dateOnlyKey = (d: Date): string => d.toISOString().slice(0, 10);
const utcDay = (key: string): Date => new Date(`${key}T00:00:00.000Z`);
const localMidnight = (key: string): Date => new Date(`${key}T00:00:00`);

@Injectable()
export class SchedulingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  // ─── Shifts ─────────────────────────────────────────────────────────────────

  async findShifts(query: FindShiftsQueryDto): Promise<ShiftResponseDto[]> {
    const from = new Date(query.from);
    const to = new Date(query.to);
    if (to <= from) throw new BadRequestException('"to" must be after "from"');
    if (to.getTime() - from.getTime() > MAX_QUERY_DAYS * DAY_MS) {
      throw new BadRequestException(`Date range cannot exceed ${MAX_QUERY_DAYS} days`);
    }

    const shifts = await this.prisma.shift.findMany({
      where: {
        ...(query.userId && { userId: query.userId }),
        startsAt: { lt: to },
        endsAt: { gt: from },
      },
      include: SHIFT_INCLUDE,
      orderBy: { startsAt: 'asc' },
    });
    return shifts.map((s) => this.toShiftDto(s));
  }

  async createShift(dto: CreateShiftDto, adminId: string): Promise<ShiftResponseDto> {
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    await this.assertSchedulable(dto.userId, startsAt, endsAt);

    const shift = await this.prisma.shift.create({
      data: {
        userId: dto.userId,
        startsAt,
        endsAt,
        notes: dto.notes ?? null,
        createdById: adminId,
      },
      include: SHIFT_INCLUDE,
    });
    return this.toShiftDto(shift);
  }

  async updateShift(id: string, dto: UpdateShiftDto): Promise<ShiftResponseDto> {
    const existing = await this.prisma.shift.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Shift ${id} not found`);

    const userId = dto.userId ?? existing.userId;
    const startsAt = dto.startsAt ? new Date(dto.startsAt) : existing.startsAt;
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : existing.endsAt;
    await this.assertSchedulable(userId, startsAt, endsAt, id);

    const shift = await this.prisma.shift.update({
      where: { id },
      data: {
        userId,
        startsAt,
        endsAt,
        ...(dto.notes !== undefined && { notes: dto.notes || null }),
      },
      include: SHIFT_INCLUDE,
    });
    return this.toShiftDto(shift);
  }

  async deleteShift(id: string): Promise<void> {
    const existing = await this.prisma.shift.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException(`Shift ${id} not found`);
    await this.prisma.shift.delete({ where: { id } });
  }

  /** Repeats one week's schedule in another week, skipping shifts that would clash. */
  async copyWeek(dto: CopyWeekDto, adminId: string): Promise<{ created: number; skipped: number }> {
    const source = new Date(dto.sourceWeekStart);
    const target = new Date(dto.targetWeekStart);
    const offset = target.getTime() - source.getTime();
    if (offset === 0) throw new BadRequestException('Source and target weeks are the same');

    const shifts = await this.prisma.shift.findMany({
      where: { startsAt: { gte: source, lt: new Date(source.getTime() + 7 * DAY_MS) } },
      select: { userId: true, startsAt: true, endsAt: true, notes: true },
    });

    let created = 0;
    let skipped = 0;
    for (const s of shifts) {
      const startsAt = new Date(s.startsAt.getTime() + offset);
      const endsAt = new Date(s.endsAt.getTime() + offset);
      try {
        await this.assertSchedulable(s.userId, startsAt, endsAt);
      } catch (err) {
        if (err instanceof BadRequestException || err instanceof NotFoundException) {
          skipped += 1;
          continue;
        }
        throw err;
      }
      await this.prisma.shift.create({
        data: { userId: s.userId, startsAt, endsAt, notes: s.notes, createdById: adminId },
      });
      created += 1;
    }
    return { created, skipped };
  }

  // ─── Time off ───────────────────────────────────────────────────────────────

  async findTimeOff(
    query: FindTimeOffQueryDto,
    viewer: AuthenticatedUser,
  ): Promise<TimeOffResponseDto[]> {
    const isAdmin = viewer.role === UserRole.ADMIN;
    // Approved time off is shown on the shared schedule; everything else is private
    const userId = isAdmin || query.status === TimeOffStatus.APPROVED ? query.userId : viewer.id;

    const where: Prisma.TimeOffRequestWhereInput = {
      ...(userId && { userId }),
      ...(query.status && { status: query.status }),
      ...(query.from && { endDate: { gte: utcDay(dayKey(new Date(query.from))) } }),
      ...(query.to && { startDate: { lte: utcDay(dayKey(new Date(query.to))) } }),
    };

    const rows = await this.prisma.timeOffRequest.findMany({
      where,
      include: TIME_OFF_INCLUDE,
      orderBy: [{ startDate: 'desc' }],
      take: 200,
    });
    return rows.map((r) => this.toTimeOffDto(r));
  }

  async requestTimeOff(dto: RequestTimeOffDto, userId: string): Promise<TimeOffResponseDto> {
    if (dto.endDate < dto.startDate) {
      throw new BadRequestException('End date must be on or after the start date');
    }
    if (dto.startDate < dayKey(new Date())) {
      throw new BadRequestException('Time off cannot start in the past');
    }
    const days = this.inclusiveDays(dto.startDate, dto.endDate);
    if (days > MAX_TIME_OFF_DAYS) {
      throw new BadRequestException(`A single request cannot exceed ${MAX_TIME_OFF_DAYS} days`);
    }

    const clash = await this.prisma.timeOffRequest.findFirst({
      where: {
        userId,
        status: { in: [TimeOffStatus.PENDING, TimeOffStatus.APPROVED] },
        startDate: { lte: utcDay(dto.endDate) },
        endDate: { gte: utcDay(dto.startDate) },
      },
      select: { id: true },
    });
    if (clash) throw new BadRequestException('You already have time off requested for these dates');

    const row = await this.prisma.timeOffRequest.create({
      data: {
        userId,
        startDate: utcDay(dto.startDate),
        endDate: utcDay(dto.endDate),
        reason: dto.reason ?? null,
      },
      include: TIME_OFF_INCLUDE,
    });
    return this.toTimeOffDto(row);
  }

  async reviewTimeOff(
    id: string,
    dto: ReviewTimeOffDto,
    adminId: string,
  ): Promise<TimeOffResponseDto> {
    const existing = await this.prisma.timeOffRequest.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Time off request ${id} not found`);
    if (existing.status !== TimeOffStatus.PENDING) {
      throw new BadRequestException('Only pending requests can be reviewed');
    }

    const row = await this.prisma.timeOffRequest.update({
      where: { id },
      data: {
        status: dto.status,
        reviewedById: adminId,
        reviewedAt: new Date(),
        reviewNote: dto.note ?? null,
      },
      include: TIME_OFF_INCLUDE,
    });

    // Tell the reviewer which planned shifts now need covering
    const conflictingShifts =
      dto.status === TimeOffStatus.APPROVED
        ? await this.prisma.shift.count({
            where: {
              userId: row.userId,
              startsAt: { lt: this.endOfRange(row.endDate) },
              endsAt: { gt: localMidnight(dateOnlyKey(row.startDate)) },
            },
          })
        : 0;

    return { ...this.toTimeOffDto(row), conflictingShifts };
  }

  async cancelTimeOff(id: string, viewer: AuthenticatedUser): Promise<TimeOffResponseDto> {
    const existing = await this.prisma.timeOffRequest.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Time off request ${id} not found`);
    if (existing.userId !== viewer.id && viewer.role !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only cancel your own requests');
    }
    const cancellable =
      existing.status === TimeOffStatus.PENDING ||
      (existing.status === TimeOffStatus.APPROVED &&
        dateOnlyKey(existing.startDate) > dayKey(new Date()));
    if (!cancellable) {
      throw new BadRequestException('This request can no longer be cancelled');
    }

    const row = await this.prisma.timeOffRequest.update({
      where: { id },
      data: { status: TimeOffStatus.CANCELLED },
      include: TIME_OFF_INCLUDE,
    });
    return this.toTimeOffDto(row);
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private async assertSchedulable(
    userId: string,
    startsAt: Date,
    endsAt: Date,
    excludeShiftId?: string,
  ): Promise<void> {
    const user = await this.usersService.findOne(userId);
    if (!user.isActive) throw new BadRequestException(`${user.name} is deactivated`);

    const minutes = (endsAt.getTime() - startsAt.getTime()) / 60_000;
    if (minutes < MIN_SHIFT_MINUTES) {
      throw new BadRequestException('A shift must end at least 15 minutes after it starts');
    }
    if (minutes > MAX_SHIFT_HOURS * 60) {
      throw new BadRequestException(`A shift cannot be longer than ${MAX_SHIFT_HOURS} hours`);
    }

    const overlap = await this.prisma.shift.findFirst({
      where: {
        userId,
        ...(excludeShiftId && { NOT: { id: excludeShiftId } }),
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
      select: { id: true },
    });
    if (overlap) throw new BadRequestException(`${user.name} already has a shift at that time`);

    const timeOff = await this.prisma.timeOffRequest.findFirst({
      where: {
        userId,
        status: TimeOffStatus.APPROVED,
        startDate: { lte: utcDay(dayKey(endsAt)) },
        endDate: { gte: utcDay(dayKey(startsAt)) },
      },
      select: { id: true },
    });
    if (timeOff) throw new BadRequestException(`${user.name} has approved time off then`);
  }

  private endOfRange(endDate: Date): Date {
    return new Date(localMidnight(dateOnlyKey(endDate)).getTime() + DAY_MS);
  }

  private inclusiveDays(startKey: string, endKey: string): number {
    return Math.round((utcDay(endKey).getTime() - utcDay(startKey).getTime()) / DAY_MS) + 1;
  }

  private toShiftDto(shift: ShiftRow): ShiftResponseDto {
    return {
      id: shift.id,
      user: shift.user,
      startsAt: shift.startsAt,
      endsAt: shift.endsAt,
      notes: shift.notes,
      createdBy: shift.createdBy,
    };
  }

  private toTimeOffDto(row: TimeOffRow): TimeOffResponseDto {
    const startDate = dateOnlyKey(row.startDate);
    const endDate = dateOnlyKey(row.endDate);
    return {
      id: row.id,
      user: row.user,
      startDate,
      endDate,
      days: this.inclusiveDays(startDate, endDate),
      reason: row.reason,
      status: row.status as TimeOffStatus,
      reviewedBy: row.reviewedBy,
      reviewedAt: row.reviewedAt,
      reviewNote: row.reviewNote,
      createdAt: row.createdAt,
    };
  }
}
