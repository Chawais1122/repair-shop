import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PaginatedResponse, UserRole } from '@repair-shop/shared';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { FindUsersQueryDto } from './dto/find-users-query.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';

const BCRYPT_COST = 12;

const toDecimal = (v: number | null | undefined): Prisma.Decimal | null | undefined =>
  v === undefined ? undefined : v === null ? null : new Prisma.Decimal(v);

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findTechnicians(): Promise<
    Array<{ id: string; name: string; email: string; role: UserRole }>
  > {
    const users = await this.prisma.user.findMany({
      where: { role: UserRole.TECHNICIAN, isActive: true },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: 'asc' },
    });
    return users as unknown as Array<{ id: string; name: string; email: string; role: UserRole }>;
  }

  async findAll(
    query: FindUsersQueryDto,
    viewerRole: UserRole,
  ): Promise<PaginatedResponse<UserResponseDto>> {
    const { search, role, includeInactive = false, page = 1, limit = 20 } = query;
    const where: Prisma.UserWhereInput = {
      ...(!includeInactive && { isActive: true }),
      ...(role && { role }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users.map((u) => this.forViewer(this.toResponseDto(u), viewerRole)),
      meta: { page, limit, total },
    };
  }

  async findOne(id: string, viewerRole: UserRole = UserRole.ADMIN): Promise<UserResponseDto> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return this.forViewer(this.toResponseDto(user), viewerRole);
  }

  /** Pay rates are visible to admins only. */
  private forViewer(dto: UserResponseDto, viewerRole: UserRole): UserResponseDto {
    return viewerRole === UserRole.ADMIN ? dto : { ...dto, hourlyRate: null };
  }

  async create(dto: CreateUserDto): Promise<UserResponseDto> {
    const email = dto.email.trim().toLowerCase();
    if (await this.findByEmail(email)) {
      throw new ConflictException(`A user with email ${email} already exists`);
    }

    const user = await this.prisma.user.create({
      data: {
        email,
        name: dto.name,
        role: dto.role,
        passwordHash: await bcrypt.hash(dto.password, BCRYPT_COST),
        phone: dto.phone ?? null,
        hourlyRate: toDecimal(dto.hourlyRate) ?? null,
        monthlySalesTarget: toDecimal(dto.monthlySalesTarget) ?? null,
      },
    });
    return this.toResponseDto(user);
  }

  async update(id: string, dto: UpdateUserDto, actorId: string): Promise<UserResponseDto> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException(`User ${id} not found`);

    const losesAdmin =
      user.role === UserRole.ADMIN &&
      ((dto.role !== undefined && dto.role !== UserRole.ADMIN) || dto.isActive === false);

    if (losesAdmin && id === actorId) {
      throw new BadRequestException('You cannot remove your own admin access');
    }
    if (losesAdmin) {
      const otherAdmins = await this.prisma.user.count({
        where: { role: UserRole.ADMIN, isActive: true, NOT: { id } },
      });
      if (otherAdmins === 0) throw new BadRequestException('At least one active admin is required');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.role !== undefined && { role: dto.role }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.phone !== undefined && { phone: dto.phone || null }),
        ...(dto.hourlyRate !== undefined && { hourlyRate: toDecimal(dto.hourlyRate) }),
        ...(dto.monthlySalesTarget !== undefined && {
          monthlySalesTarget: toDecimal(dto.monthlySalesTarget),
        }),
      },
    });
    return this.toResponseDto(updated);
  }

  async resetPassword(id: string, dto: ResetPasswordDto): Promise<void> {
    await this.findOne(id);
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash: await bcrypt.hash(dto.password, BCRYPT_COST) },
    });
  }

  private toResponseDto(user: User): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
      isActive: user.isActive,
      phone: user.phone,
      hourlyRate: user.hourlyRate?.toFixed(2) ?? null,
      monthlySalesTarget: user.monthlySalesTarget?.toFixed(2) ?? null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
