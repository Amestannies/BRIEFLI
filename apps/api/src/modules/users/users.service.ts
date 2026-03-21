import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(firmId: string) {
    return this.prisma.user.findMany({
      where: { firmId, deletedAt: null, isActive: true },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, avatarUrl: true, createdAt: true },
    });
  }

  async findOne(firmId: string, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, firmId, deletedAt: null },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, avatarUrl: true, barNumber: true, mfaEnabled: true, isActive: true, createdAt: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(firmId: string, id: string, data: Record<string, unknown>) {
    await this.findOne(firmId, id);
    const { passwordHash: _ph, mfaSecret: _ms, ...safe } = data as Record<string, unknown>;
    return this.prisma.user.update({ where: { id }, data: safe as never });
  }

  async deactivate(firmId: string, id: string) {
    await this.findOne(firmId, id);
    return this.prisma.user.update({ where: { id }, data: { isActive: false } });
  }
}
