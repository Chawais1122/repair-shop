import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { InvoiceStatus } from '@repair-shop/shared';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class FindInvoicesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
