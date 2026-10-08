import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { TicketStatus } from '@repair-shop/shared';

export class FindTicketsQueryDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsEnum(TicketStatus) status?: TicketStatus;
  @IsOptional() @IsString() assignedToId?: string;
  @IsOptional() @IsString() customerId?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number = 20;
}
