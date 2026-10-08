import { IsDateString, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ClockActionDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  notes?: string;
}

export class CreateTimeEntryDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsDateString()
  clockIn!: string;

  @IsOptional()
  @IsDateString()
  clockOut?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  notes?: string;
}

export class UpdateTimeEntryDto {
  @IsOptional()
  @IsDateString()
  clockIn?: string;

  // null re-opens the entry (employee still on the clock)
  @IsOptional()
  @IsDateString()
  clockOut?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  notes?: string | null;
}

export class FindTimeEntriesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

export class TimesheetQueryDto {
  @IsDateString()
  from!: string;

  @IsDateString()
  to!: string;

  @IsOptional()
  @IsString()
  userId?: string;
}
