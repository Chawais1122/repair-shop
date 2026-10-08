import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

/** A retail product from inventory (partId) or a custom line (description + unitPrice). */
export class InvoiceLineDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  partId?: string;

  @ValidateIf((o: InvoiceLineDto) => !o.partId || o.description !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  description?: string;

  @IsInt()
  @Min(1)
  @Max(1000)
  quantity!: number;

  @ValidateIf((o: InvoiceLineDto) => !o.partId || o.unitPrice !== undefined)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitPrice?: number;
}

export class CreateInvoiceDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  customerId?: string;

  /** Bill a repair ticket: its parts & labor are copied onto the invoice. */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  ticketId?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => InvoiceLineDto)
  items?: InvoiceLineDto[];

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  discount?: number;

  /** Percentage, e.g. 8.25 */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  taxRate?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
