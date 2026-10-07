import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { UserRole } from '@repair-shop/shared';
import { PrismaService } from '../prisma/prisma.service';

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
}
