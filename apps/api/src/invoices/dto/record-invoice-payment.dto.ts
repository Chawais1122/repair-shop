import { IsEnum, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { PaymentMethod } from '@repair-shop/shared';

export class RecordInvoicePaymentDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  transactionId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  notes?: string;
}
