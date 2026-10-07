import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { UserRole } from '@repair-shop/shared';
import { Roles } from '../auth/decorators/roles.decorator';
import { DevicesService } from './devices.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { DeviceResponseDto } from './dto/device-response.dto';
import { FindDevicesQueryDto } from './dto/find-devices-query.dto';
import { PaginatedResponse } from '@repair-shop/shared';

@Controller('customers/:customerId/devices')
export class CustomerDevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Get()
  findAll(
    @Param('customerId') customerId: string,
    @Query() query: FindDevicesQueryDto,
  ): Promise<PaginatedResponse<DeviceResponseDto>> {
    return this.devicesService.findAll(customerId, query);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @HttpCode(HttpStatus.CREATED)
  create(
    @Param('customerId') customerId: string,
    @Body() dto: CreateDeviceDto,
  ): Promise<DeviceResponseDto> {
    return this.devicesService.create(customerId, dto);
  }
}
