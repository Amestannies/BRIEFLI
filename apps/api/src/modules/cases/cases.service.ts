import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MILESTONE_TEMPLATES } from '@briefli/shared';

@Injectable()
export class CasesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(firmId: string, filters: Record<string, string>) {
    const { status, caseType, userId, search, page = '1', limit = '20' } = filters;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      firmId,
      deletedAt: null,
      ...(status && { status: status as never }),
      ...(caseType && { caseType: caseType as never }),
      ...(userId && { users: { some: { userId } } }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' as never } },
          { internalRef: { contains: search, mode: 'insensitive' as never } },
          { propertyAddress: { contains: search, mode: 'insensitive' as never } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.case.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          users: { include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } } },
          clients: { include: { client: { select: { id: true, firstName: true, lastName: true } } }, take: 1 },
        },
      }),
      this.prisma.case.count({ where }),
    ]);

    return {
      data,
      meta: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) },
    };
  }

  async create(firmId: string, userId: string, data: Record<string, unknown>) {
    // Auto-generate internal reference
    const year = new Date().getFullYear();
    const count = await this.prisma.case.count({ where: { firmId } });
    const internalRef = `LT-${year}-${String(count + 1).padStart(4, '0')}`;

    const newCase = await this.prisma.case.create({
      data: {
        firmId,
        internalRef,
        title: data.title as string,
        caseType: data.caseType as never,
        propertyAddress: data.propertyAddress as string | undefined,
        court: data.court as string | undefined,
        description: data.description as string | undefined,
        expectedCloseDate: data.expectedCloseDate ? new Date(data.expectedCloseDate as string) : undefined,
        users: { create: { userId } },
      },
    });

    // Seed milestone template
    const templates = MILESTONE_TEMPLATES[newCase.caseType];
    if (templates) {
      await this.prisma.milestone.createMany({
        data: templates.map((title, index) => ({
          caseId: newCase.id,
          title,
          order: index,
        })),
      });
    }

    return newCase;
  }

  async findOne(firmId: string, id: string) {
    const c = await this.prisma.case.findFirst({
      where: { id, firmId, deletedAt: null },
      include: {
        users: { include: { user: { select: { id: true, firstName: true, lastName: true, role: true, avatarUrl: true } } } },
        clients: { include: { client: true } },
        milestones: { orderBy: { order: 'asc' } },
        _count: { select: { documents: true, timeEntries: true, events: true } },
      },
    });
    if (!c) throw new NotFoundException('Case not found');
    return c;
  }

  async update(firmId: string, id: string, data: Record<string, unknown>) {
    await this.findOne(firmId, id);

    if (data.status === 'CLOSED') {
      data.closedDate = new Date().toISOString();
    }

    return this.prisma.case.update({
      where: { id },
      data: data as never,
    });
  }

  async remove(firmId: string, id: string) {
    await this.findOne(firmId, id);
    return this.prisma.case.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async getTimeline(firmId: string, caseId: string) {
    await this.findOne(firmId, caseId);
    return this.prisma.caseNote.findMany({
      where: { caseId },
      orderBy: { createdAt: 'desc' },
      include: { case: { select: { title: true } } },
    });
  }

  async getMilestones(firmId: string, caseId: string) {
    await this.findOne(firmId, caseId);
    return this.prisma.milestone.findMany({
      where: { caseId },
      orderBy: { order: 'asc' },
    });
  }

  async createMilestone(firmId: string, caseId: string, data: Record<string, unknown>) {
    await this.findOne(firmId, caseId);
    return this.prisma.milestone.create({
      data: { caseId, title: data.title as string, order: data.order as number, dueDate: data.dueDate ? new Date(data.dueDate as string) : undefined },
    });
  }

  async completeMilestone(firmId: string, caseId: string, milestoneId: string, userId: string) {
    await this.findOne(firmId, caseId);
    return this.prisma.milestone.update({
      where: { id: milestoneId },
      data: { completedAt: new Date(), completedById: userId },
    });
  }

  async createNote(firmId: string, caseId: string, authorId: string, body: string) {
    await this.findOne(firmId, caseId);
    return this.prisma.caseNote.create({ data: { caseId, authorId, body } });
  }

  async getNotes(firmId: string, caseId: string) {
    await this.findOne(firmId, caseId);
    return this.prisma.caseNote.findMany({
      where: { caseId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async checkConflict(firmId: string, opposingCounsel: string): Promise<boolean> {
    if (!opposingCounsel) return false;
    const count = await this.prisma.case.count({
      where: { firmId, opposingCounsel: { contains: opposingCounsel, mode: 'insensitive' }, deletedAt: null },
    });
    return count > 0;
  }

  // Stub: apply milestone template
  async applyTemplate(firmId: string, caseId: string, caseType: string) {
    await this.findOne(firmId, caseId);
    const templates = MILESTONE_TEMPLATES[caseType];
    if (!templates) throw new BadRequestException('No template for this case type');
    return this.prisma.milestone.createMany({
      data: templates.map((title, index) => ({ caseId, title, order: index })),
    });
  }
}
