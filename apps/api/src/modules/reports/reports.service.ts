import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async caseReport(firmId: string, _query: Record<string, string>) {
    const byStatus = await this.prisma.case.groupBy({
      by: ['status'],
      where: { firmId, deletedAt: null },
      _count: true,
    });
    const byType = await this.prisma.case.groupBy({
      by: ['caseType'],
      where: { firmId, deletedAt: null },
      _count: true,
    });
    return { byStatus, byType };
  }

  async activityReport(firmId: string, _query: Record<string, string>) {
    const recentCases = await this.prisma.case.findMany({
      where: { firmId, deletedAt: null },
      orderBy: { updatedAt: 'desc' },
      take: 10,
      select: { id: true, title: true, status: true, updatedAt: true },
    });
    return { recentCases };
  }
}
