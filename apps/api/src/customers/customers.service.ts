import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaginatedResponse } from '@repair-shop/shared';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { CustomerResponseDto } from './dto/customer-response.dto';
import { FindCustomersQueryDto } from './dto/find-customers-query.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: FindCustomersQueryDto): Promise<PaginatedResponse<CustomerResponseDto>> {
    const { search, page = 1, limit = 20 } = query;

    const where: Prisma.CustomerWhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [customers, total] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      data: customers.map((c) => this.toResponseDto(c)),
      meta: { page, limit, total },
    };
  }

  async findOne(id: string): Promise<CustomerResponseDto> {
    const customer = await this.prisma.customer.findUnique({ where: { id } });
    if (!customer) throw new NotFoundException(`Customer ${id} not found`);
    return this.toResponseDto(customer);
  }

  async create(dto: CreateCustomerDto): Promise<CustomerResponseDto> {
    const existing = await this.prisma.customer.findUnique({
      where: { phone: dto.phone },
    });
    if (existing) {
      throw new ConflictException(`A customer with phone ${dto.phone} already exists`);
    }

    const customer = await this.prisma.customer.create({ data: dto });
    return this.toResponseDto(customer);
  }

  async update(id: string, dto: UpdateCustomerDto): Promise<CustomerResponseDto> {
    await this.findOne(id);

    if (dto.phone) {
      const conflict = await this.prisma.customer.findFirst({
        where: { phone: dto.phone, NOT: { id } },
      });
      if (conflict) {
        throw new ConflictException(`A customer with phone ${dto.phone} already exists`);
      }
    }

    const customer = await this.prisma.customer.update({ where: { id }, data: dto });
    return this.toResponseDto(customer);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);

    try {
      await this.prisma.customer.delete({ where: { id } });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2003'
      ) {
        throw new BadRequestException(
          'Cannot delete a customer who has existing repair tickets',
        );
      }
      this.logger.error('Failed to delete customer', { id, err });
      throw err;
    }
  }

  private toResponseDto(
    customer: Prisma.CustomerGetPayload<Record<string, never>>,
  ): CustomerResponseDto {
    return {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
      notes: customer.notes,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
    };
  }
}
