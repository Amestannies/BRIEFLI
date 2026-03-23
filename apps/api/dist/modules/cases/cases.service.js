"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CasesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const shared_1 = require("@briefli/shared");
let CasesService = class CasesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(firmId, filters) {
        const { status, caseType, userId, search, page = '1', limit = '20' } = filters;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const where = {
            firmId,
            deletedAt: null,
            ...(status && { status: status }),
            ...(caseType && { caseType: caseType }),
            ...(userId && { users: { some: { userId } } }),
            ...(search && {
                OR: [
                    { title: { contains: search, mode: 'insensitive' } },
                    { internalRef: { contains: search, mode: 'insensitive' } },
                    { propertyAddress: { contains: search, mode: 'insensitive' } },
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
    async create(firmId, userId, data) {
        const year = new Date().getFullYear();
        const count = await this.prisma.case.count({ where: { firmId } });
        const internalRef = `LT-${year}-${String(count + 1).padStart(4, '0')}`;
        const newCase = await this.prisma.case.create({
            data: {
                firmId,
                internalRef,
                title: data.title,
                caseType: data.caseType,
                propertyAddress: data.propertyAddress,
                court: data.court,
                description: data.description,
                expectedCloseDate: data.expectedCloseDate ? new Date(data.expectedCloseDate) : undefined,
                users: { create: { userId } },
            },
        });
        const templates = shared_1.MILESTONE_TEMPLATES[newCase.caseType];
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
    async findOne(firmId, id) {
        const c = await this.prisma.case.findFirst({
            where: { id, firmId, deletedAt: null },
            include: {
                users: { include: { user: { select: { id: true, firstName: true, lastName: true, role: true, avatarUrl: true } } } },
                clients: { include: { client: true } },
                milestones: { orderBy: { order: 'asc' } },
                _count: { select: { documents: true, timeEntries: true, events: true } },
            },
        });
        if (!c)
            throw new common_1.NotFoundException('Case not found');
        return c;
    }
    async update(firmId, id, data) {
        await this.findOne(firmId, id);
        if (data.status === 'CLOSED') {
            data.closedDate = new Date().toISOString();
        }
        return this.prisma.case.update({
            where: { id },
            data: data,
        });
    }
    async remove(firmId, id) {
        await this.findOne(firmId, id);
        return this.prisma.case.update({ where: { id }, data: { deletedAt: new Date() } });
    }
    async getTimeline(firmId, caseId) {
        await this.findOne(firmId, caseId);
        return this.prisma.caseNote.findMany({
            where: { caseId },
            orderBy: { createdAt: 'desc' },
            include: { case: { select: { title: true } } },
        });
    }
    async getMilestones(firmId, caseId) {
        await this.findOne(firmId, caseId);
        return this.prisma.milestone.findMany({
            where: { caseId },
            orderBy: { order: 'asc' },
        });
    }
    async createMilestone(firmId, caseId, data) {
        await this.findOne(firmId, caseId);
        return this.prisma.milestone.create({
            data: { caseId, title: data.title, order: data.order, dueDate: data.dueDate ? new Date(data.dueDate) : undefined },
        });
    }
    async completeMilestone(firmId, caseId, milestoneId, userId) {
        await this.findOne(firmId, caseId);
        return this.prisma.milestone.update({
            where: { id: milestoneId },
            data: { completedAt: new Date(), completedById: userId },
        });
    }
    async createNote(firmId, caseId, authorId, body) {
        await this.findOne(firmId, caseId);
        return this.prisma.caseNote.create({ data: { caseId, authorId, body } });
    }
    async getNotes(firmId, caseId) {
        await this.findOne(firmId, caseId);
        return this.prisma.caseNote.findMany({
            where: { caseId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async checkConflict(firmId, opposingCounsel) {
        if (!opposingCounsel)
            return false;
        const count = await this.prisma.case.count({
            where: { firmId, opposingCounsel: { contains: opposingCounsel, mode: 'insensitive' }, deletedAt: null },
        });
        return count > 0;
    }
    async applyTemplate(firmId, caseId, caseType) {
        await this.findOne(firmId, caseId);
        const templates = shared_1.MILESTONE_TEMPLATES[caseType];
        if (!templates)
            throw new common_1.BadRequestException('No template for this case type');
        return this.prisma.milestone.createMany({
            data: templates.map((title, index) => ({ caseId, title, order: index })),
        });
    }
};
exports.CasesService = CasesService;
exports.CasesService = CasesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CasesService);
