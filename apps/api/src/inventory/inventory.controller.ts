import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { PaginatedResponse, UserRole } from '@repair-shop/shared';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { CreatePartDto } from './dto/create-part.dto';
import { FindPartsQueryDto } from './dto/find-parts-query.dto';
import {
  InventorySummaryDto,
  PartResponseDto,
  StockMovementResponseDto,
} from './dto/part-response.dto';
import { UpdatePartDto } from './dto/update-part.dto';
import { InventoryService } from './inventory.service';

@Controller('parts')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  findAll(@Query() query: FindPartsQueryDto): Promise<PaginatedResponse<PartResponseDto>> {
    return this.inventoryService.findAll(query);
  }

  @Get('categories')
  getCategories(): Promise<string[]> {
    return this.inventoryService.getCategories();
  }

  @Get('summary')
  getSummary(): Promise<InventorySummaryDto> {
    return this.inventoryService.getSummary();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<PartResponseDto> {
    return this.inventoryService.findOne(id);
  }

  @Get(':id/movements')
  getMovements(
    @Param('id') id: string,
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResponse<StockMovementResponseDto>> {
    return this.inventoryService.getMovements(id, query);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreatePartDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PartResponseDto> {
    return this.inventoryService.create(dto, user.id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  update(@Param('id') id: string, @Body() dto: UpdatePartDto): Promise<PartResponseDto> {
    return this.inventoryService.update(id, dto);
  }

  @Post(':id/adjust')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  adjustStock(
    @Param('id') id: string,
    @Body() dto: AdjustStockDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PartResponseDto> {
    return this.inventoryService.adjustStock(id, dto, user.id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  deactivate(@Param('id') id: string): Promise<void> {
    return this.inventoryService.deactivate(id);
  }
}
