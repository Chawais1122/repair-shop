import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { UserRole } from '@repair-shop/shared';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { QueryBoolean } from '../../common/dto/query-boolean';

export class FindUsersQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @QueryBoolean()
  @IsBoolean()
  includeInactive?: boolean;
}
