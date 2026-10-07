import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { Priority } from '@repair-shop/shared';

export class CreateTicketDto {
  @IsUUID() customerId!: string;
  @IsUUID() deviceId!: string;
  @IsEnum(Priority) @IsOptional() priority?: Priority;
  @IsString() @IsNotEmpty() reportedProblem!: string;
  @IsDateString() @IsOptional() expectedCompletionAt?: string;
}
