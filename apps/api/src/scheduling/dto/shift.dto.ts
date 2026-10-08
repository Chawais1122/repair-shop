import { IsDateString, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateShiftDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsDateString()
  startsAt!: string;

  @IsDateString()
  endsAt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  notes?: string;
}

// Used by the drag-and-drop planner to move a shift to another day or employee.
export class UpdateShiftDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  userId?: string;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  notes?: string | null;
}

export class FindShiftsQueryDto {
  @IsDateString()
  from!: string;

  @IsDateString()
  to!: string;

  @IsOptional()
  @IsString()
  userId?: string;
}

export class CopyWeekDto {
  /** Local midnight of the Monday to copy from. */
  @IsDateString()
  sourceWeekStart!: string;

  @IsDateString()
  targetWeekStart!: string;
}

export class ShiftResponseDto {
  id!: string;
  user!: { id: string; name: string };
  startsAt!: Date;
  endsAt!: Date;
  notes!: string | null;
  createdBy!: { id: string; name: string };
}
