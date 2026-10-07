import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaymentStatus } from '@repair-shop/shared';

export class UpdatePaymentDto {
  @IsEnum(PaymentStatus)
  @IsOptional()
  status?: PaymentStatus;

  @IsString()
  @IsOptional()
  notes?: string;
}
