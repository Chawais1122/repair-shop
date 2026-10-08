import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PurchaseOrderStatus } from '@repair-shop/shared';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class FindPurchaseOrdersQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(PurchaseOrderStatus)
  status?: PurchaseOrderStatus;

  @IsOptional()
  @IsString()
  supplierId?: string;
}
