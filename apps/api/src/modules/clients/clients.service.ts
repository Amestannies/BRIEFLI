import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(firmId: string, filters: Record<string, string>) {
    const { search, page = '1', limit = '20' } = filters;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      firmId,
      deletedAt: null,
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' as never } },
          { lastName: { contains: search, mode: 'insensitive' as never } },
          { email: { contains: search, mode: 'insensitive' as never } },
          { phone: { contains: search, mode: 'insensitive' as never } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { cases: true } },
        },
      }),
      this.prisma.client.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    };
  }

  async create(firmId: string, data: Record<string, unknown>) {
    return this.prisma.client.create({
      data: {
        firmId,
        firstName: data.firstName as string,
        lastName: data.lastName as string,
        email: data.email as string,
        phone: (data.phone as string) || null,
        address: (data.address as string) || null,
        preferredLang: (data.preferredLang as string) || 'en',
      },
    });
  }

  async findOne(firmId: string, id: string) {
    const client = await this.prisma.client.findFirst({
      where: { id, firmId, deletedAt: null },
      include: {
        cases: {
          include: {
            case: {
              select: {
                id: true,
                internalRef: true,
                title: true,
                caseType: true,
                status: true,
                openDate: true,
                expectedCloseDate: true,
              },
            },
          },
          orderBy: { case: { createdAt: 'desc' } },
        },
        _count: { select: { cases: true, documents: true } },
      },
    });

    if (!client) throw new NotFoundException('Client not found');
    return client;
  }

  async update(firmId: string, id: string, data: Record<string, unknown>) {
    await this.findOne(firmId, id);
    return this.prisma.client.update({
      where: { id },
      data: {
        firstName: data.firstName as string | undefined,
        lastName: data.lastName as string | undefined,
        email: data.email as string | undefined,
        phone: data.phone !== undefined ? (data.phone as string | null) : undefined,
        address: data.address !== undefined ? (data.address as string | null) : undefined,
        preferredLang: data.preferredLang as string | undefined,
        portalEnabled: data.portalEnabled as boolean | undefined,
      },
    });
  }

  async remove(firmId: string, id: string) {
    await this.findOne(firmId, id);
    return this.prisma.client.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async enablePortal(firmId: string, id: string) {
    await this.findOne(firmId, id);
    const token = `portal_${Math.random().toString(36).slice(2)}_${Date.now()}`;
    return this.prisma.client.update({
      where: { id },
      data: { portalEnabled: true, portalToken: token },
    });
  }

  async disablePortal(firmId: string, id: string) {
    await this.findOne(firmId, id);
    return this.prisma.client.update({
      where: { id },
      data: { portalEnabled: false, portalToken: null },
    });
  }

  async linkToCase(firmId: string, clientId: string, caseId: string) {
    // Verify both belong to the firm
    await this.findOne(firmId, clientId);
    const foundCase = await this.prisma.case.findFirst({ where: { id: caseId, firmId, deletedAt: null } });
    if (!foundCase) throw new NotFoundException('Case not found');

    return this.prisma.caseClient.upsert({
      where: { caseId_clientId: { caseId, clientId } },
      create: { caseId, clientId },
      update: {},
    });
  }

  async unlinkFromCase(firmId: string, clientId: string, caseId: string) {
    await this.findOne(firmId, clientId);
    return this.prisma.caseClient.deleteMany({ where: { caseId, clientId } });
  }
}
