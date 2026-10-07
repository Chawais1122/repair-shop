import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Priority } from '@repair-shop/shared';

export class UpdateTicketDto {
  @IsEnum(Priority) @IsOptional() priority?: Priority;
  @IsString() @IsOptional() reportedProblem?: string;
  @IsString() @IsOptional() diagnosis?: string;
  @IsNumber() @IsOptional() @Min(0) estimatedCost?: number;
  @IsNumber() @IsOptional() @Min(0) finalCost?: number;
  @IsDateString() @IsOptional() expectedCompletionAt?: string;
}
