import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

/**
 * A part from inventory (partId set — price and cost default from the part)
 * or a labor/custom line (no partId — description and unitPrice required).
 */
export class CreateTicketItemDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  partId?: string;

  @ValidateIf((o: CreateTicketItemDto) => !o.partId || o.description !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  description?: string;

  @IsInt()
  @Min(1)
  @Max(1000)
  quantity!: number;

  @ValidateIf((o: CreateTicketItemDto) => !o.partId || o.unitPrice !== undefined)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitPrice?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitCost?: number;
}
