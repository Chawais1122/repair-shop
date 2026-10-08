import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class VoidInvoiceDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  reason!: string;
}
