import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DeviceType, PaginatedResponse } from '@repair-shop/shared';
import { EncryptionService } from '../common/services/encryption.service';
import { CustomersService } from '../customers/customers.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { DeviceResponseDto } from './dto/device-response.dto';
import { FindDevicesQueryDto } from './dto/find-devices-query.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';

@Injectable()
export class DevicesService {
  private readonly logger = new Logger(DevicesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly customersService: CustomersService,
    private readonly encryptionService: EncryptionService,
  ) {}

  async findAll(
    customerId: string,
    query: FindDevicesQueryDto,
  ): Promise<PaginatedResponse<DeviceResponseDto>> {
    await this.customersService.findOne(customerId);

    const { search, page = 1, limit = 20 } = query;

    const baseWhere: Prisma.DeviceWhereInput = { customerId };
    const where: Prisma.DeviceWhereInput = search
      ? {
          ...baseWhere,
          OR: [
            { brand: { contains: search, mode: 'insensitive' } },
            { model: { contains: search, mode: 'insensitive' } },
            { serialNumber: { contains: search, mode: 'insensitive' } },
            { imei: { contains: search, mode: 'insensitive' } },
          ],
        }
      : baseWhere;

    const [devices, total] = await this.prisma.$transaction([
      this.prisma.device.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.device.count({ where }),
    ]);

    return {
      data: devices.map((d) => this.toResponseDto(d)),
      meta: { page, limit, total },
    };
  }

  async findOne(id: string): Promise<DeviceResponseDto> {
    const device = await this.prisma.device.findUnique({ where: { id } });
    if (!device) throw new NotFoundException(`Device ${id} not found`);
    return this.toResponseDto(device);
  }

  async create(customerId: string, dto: CreateDeviceDto): Promise<DeviceResponseDto> {
    await this.customersService.findOne(customerId);

    const passcode = dto.passcode ? this.encryptionService.encrypt(dto.passcode) : null;

    const device = await this.prisma.device.create({
      data: {
        customerId,
        type: dto.type,
        brand: dto.brand,
        model: dto.model,
        serialNumber: dto.serialNumber ?? null,
        imei: dto.imei ?? null,
        passcode,
        notes: dto.notes ?? null,
      },
    });

    return this.toResponseDto(device);
  }

  async update(id: string, dto: UpdateDeviceDto): Promise<DeviceResponseDto> {
    await this.findOne(id);

    const data: Prisma.DeviceUpdateInput = {
      ...(dto.type !== undefined && { type: dto.type }),
      ...(dto.brand !== undefined && { brand: dto.brand }),
      ...(dto.model !== undefined && { model: dto.model }),
      ...(dto.serialNumber !== undefined && { serialNumber: dto.serialNumber || null }),
      ...(dto.imei !== undefined && { imei: dto.imei || null }),
      ...(dto.notes !== undefined && { notes: dto.notes || null }),
    };

    if (dto.passcode !== undefined) {
      data.passcode = dto.passcode ? this.encryptionService.encrypt(dto.passcode) : null;
    }

    const device = await this.prisma.device.update({ where: { id }, data });
    return this.toResponseDto(device);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);

    try {
      await this.prisma.device.delete({ where: { id } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
        throw new BadRequestException('Cannot delete a device with existing repair tickets');
      }
      this.logger.error('Failed to delete device', { id, err });
      throw err;
    }
  }

  private toResponseDto(device: Prisma.DeviceGetPayload<Record<string, never>>): DeviceResponseDto {
    return {
      id: device.id,
      customerId: device.customerId,
      type: device.type as DeviceType,
      brand: device.brand,
      model: device.model,
      serialNumber: device.serialNumber,
      imei: device.imei,
      hasPasscode: device.passcode !== null,
      notes: device.notes,
      createdAt: device.createdAt,
      updatedAt: device.updatedAt,
    };
  }
}
