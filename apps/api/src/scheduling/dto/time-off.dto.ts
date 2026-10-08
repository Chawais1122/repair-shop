import {
  IsDateString,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { TimeOffStatus } from '@repair-shop/shared';

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export class RequestTimeOffDto {
  /** Calendar day, inclusive: YYYY-MM-DD */
  @Matches(DAY, { message: 'startDate must be YYYY-MM-DD' })
  startDate!: string;

  @Matches(DAY, { message: 'endDate must be YYYY-MM-DD' })
  endDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}

export class ReviewTimeOffDto {
  @IsIn([TimeOffStatus.APPROVED, TimeOffStatus.DENIED])
  status!: TimeOffStatus.APPROVED | TimeOffStatus.DENIED;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}

export class FindTimeOffQueryDto {
  @IsOptional()
  @IsEnum(TimeOffStatus)
  status?: TimeOffStatus;

  @IsOptional()
  @IsString()
  userId?: string;

  /** Only requests overlapping [from, to] (calendar days). */
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

export class TimeOffResponseDto {
  id!: string;
  user!: { id: string; name: string };
  startDate!: string;
  endDate!: string;
  days!: number;
  reason!: string | null;
  status!: TimeOffStatus;
  reviewedBy!: { id: string; name: string } | null;
  reviewedAt!: Date | null;
  reviewNote!: string | null;
  createdAt!: Date;
  /** Planned shifts that fall inside the request (set when reviewing). */
  conflictingShifts?: number;
}
