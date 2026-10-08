import { OmitType, PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreatePartDto } from './create-part.dto';

// Quantity is deliberately not editable here — stock only changes through the ledger.
export class UpdatePartDto extends PartialType(OmitType(CreatePartDto, ['initialQuantity'])) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
