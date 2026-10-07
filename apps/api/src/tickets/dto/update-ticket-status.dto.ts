import { IsEnum, IsOptional, IsString } from 'class-validator';
import { TicketStatus } from '@repair-shop/shared';

export class UpdateTicketStatusDto {
  @IsEnum(TicketStatus) status!: TicketStatus;
  @IsString() @IsOptional() notes?: string;
}
