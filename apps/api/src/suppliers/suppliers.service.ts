import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, Supplier } from '@prisma/client';
import { PaginatedResponse } from '@repair-shop/shared';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { FindSuppliersQueryDto } from './dto/find-suppliers-query.dto';
import { SupplierResponseDto } from './dto/supplier-response.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Injectable()
export class SuppliersService {
  private readonly logger = new Logger(SuppliersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: FindSuppliersQueryDto): Promise<PaginatedResponse<SupplierResponseDto>> {
    const { search, page = 1, limit = 20 } = query;

    const where: Prisma.SupplierWhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { contactName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [suppliers, total] = await this.prisma.$transaction([
      this.prisma.supplier.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.supplier.count({ where }),
    ]);

    return { data: suppliers.map((s) => this.toResponseDto(s)), meta: { page, limit, total } };
  }

  async findOne(id: string): Promise<SupplierResponseDto> {
    const supplier = await this.prisma.supplier.findUnique({ where: { id } });
    if (!supplier) throw new NotFoundException(`Supplier ${id} not found`);
    return this.toResponseDto(supplier);
  }

  async create(dto: CreateSupplierDto): Promise<SupplierResponseDto> {
    const supplier = await this.prisma.supplier.create({ data: dto });
    return this.toResponseDto(supplier);
  }

  async update(id: string, dto: UpdateSupplierDto): Promise<SupplierResponseDto> {
    await this.findOne(id);
    const supplier = await this.prisma.supplier.update({ where: { id }, data: dto });
    return this.toResponseDto(supplier);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    try {
      await this.prisma.supplier.delete({ where: { id } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
        throw new BadRequestException('Cannot delete a supplier that has purchase orders');
      }
      this.logger.error('Failed to delete supplier', { id, err });
      throw err;
    }
  }

  private toResponseDto(supplier: Supplier): SupplierResponseDto {
    return {
      id: supplier.id,
      name: supplier.name,
      contactName: supplier.contactName,
      email: supplier.email,
      phone: supplier.phone,
      website: supplier.website,
      notes: supplier.notes,
      createdAt: supplier.createdAt,
      updatedAt: supplier.updatedAt,
    };
  }
}
