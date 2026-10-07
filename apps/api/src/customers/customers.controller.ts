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
import { UserRole } from '@repair-shop/shared';
import { Roles } from '../auth/decorators/roles.decorator';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { CustomerResponseDto } from './dto/customer-response.dto';
import { FindCustomersQueryDto } from './dto/find-customers-query.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { PaginatedResponse } from '@repair-shop/shared';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  findAll(@Query() query: FindCustomersQueryDto): Promise<PaginatedResponse<CustomerResponseDto>> {
    return this.customersService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<CustomerResponseDto> {
    return this.customersService.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateCustomerDto): Promise<CustomerResponseDto> {
    return this.customersService.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  update(@Param('id') id: string, @Body() dto: UpdateCustomerDto): Promise<CustomerResponseDto> {
    return this.customersService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string): Promise<void> {
    return this.customersService.remove(id);
  }
}
