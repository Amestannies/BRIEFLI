import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FirmsService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(id: string) {
    const firm = await this.prisma.firm.findUnique({ where: { id } });
    if (!firm) throw new NotFoundException('Firm not found');
    return firm;
  }

  async update(id: string, data: Record<string, unknown>) {
    await this.findOne(id);
    return this.prisma.firm.update({ where: { id }, data: data as never });
  }
}
