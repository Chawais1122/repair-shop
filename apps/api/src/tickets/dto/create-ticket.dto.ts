import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Priority } from '@repair-shop/shared';

export class CreateTicketDto {
  @IsString() @IsNotEmpty() customerId!: string;
  @IsString() @IsNotEmpty() deviceId!: string;
  @IsEnum(Priority) @IsOptional() priority?: Priority;
  @IsString() @IsNotEmpty() reportedProblem!: string;
  @IsDateString() @IsOptional() expectedCompletionAt?: string;
}
