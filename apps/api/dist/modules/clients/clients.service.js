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
exports.ClientsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let ClientsService = class ClientsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(firmId, filters) {
        const { search, page = '1', limit = '20' } = filters;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const where = {
            firmId,
            deletedAt: null,
            ...(search && {
                OR: [
                    { firstName: { contains: search, mode: 'insensitive' } },
                    { lastName: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } },
                    { phone: { contains: search, mode: 'insensitive' } },
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
    async create(firmId, data) {
        return this.prisma.client.create({
            data: {
                firmId,
                firstName: data.firstName,
                lastName: data.lastName,
                email: data.email,
                phone: data.phone || null,
                address: data.address || null,
                preferredLang: data.preferredLang || 'en',
            },
        });
    }
    async findOne(firmId, id) {
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
        if (!client)
            throw new common_1.NotFoundException('Client not found');
        return client;
    }
    async update(firmId, id, data) {
        await this.findOne(firmId, id);
        return this.prisma.client.update({
            where: { id },
            data: {
                firstName: data.firstName,
                lastName: data.lastName,
                email: data.email,
                phone: data.phone !== undefined ? data.phone : undefined,
                address: data.address !== undefined ? data.address : undefined,
                preferredLang: data.preferredLang,
                portalEnabled: data.portalEnabled,
            },
        });
    }
    async remove(firmId, id) {
        await this.findOne(firmId, id);
        return this.prisma.client.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
    }
    async enablePortal(firmId, id) {
        await this.findOne(firmId, id);
        const token = `portal_${Math.random().toString(36).slice(2)}_${Date.now()}`;
        return this.prisma.client.update({
            where: { id },
            data: { portalEnabled: true, portalToken: token },
        });
    }
    async disablePortal(firmId, id) {
        await this.findOne(firmId, id);
        return this.prisma.client.update({
            where: { id },
            data: { portalEnabled: false, portalToken: null },
        });
    }
    async linkToCase(firmId, clientId, caseId) {
        await this.findOne(firmId, clientId);
        const foundCase = await this.prisma.case.findFirst({ where: { id: caseId, firmId, deletedAt: null } });
        if (!foundCase)
            throw new common_1.NotFoundException('Case not found');
        return this.prisma.caseClient.upsert({
            where: { caseId_clientId: { caseId, clientId } },
            create: { caseId, clientId },
            update: {},
        });
    }
    async unlinkFromCase(firmId, clientId, caseId) {
        await this.findOne(firmId, clientId);
        return this.prisma.caseClient.deleteMany({ where: { caseId, clientId } });
    }
};
exports.ClientsService = ClientsService;
exports.ClientsService = ClientsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ClientsService);
