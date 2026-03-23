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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let UsersService = class UsersService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    findAll(firmId) {
        return this.prisma.user.findMany({
            where: { firmId, deletedAt: null, isActive: true },
            select: { id: true, email: true, firstName: true, lastName: true, role: true, avatarUrl: true, createdAt: true },
        });
    }
    async findOne(firmId, id) {
        const user = await this.prisma.user.findFirst({
            where: { id, firmId, deletedAt: null },
            select: { id: true, email: true, firstName: true, lastName: true, role: true, avatarUrl: true, barNumber: true, mfaEnabled: true, isActive: true, createdAt: true },
        });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        return user;
    }
    async update(firmId, id, data) {
        await this.findOne(firmId, id);
        const { passwordHash: _ph, mfaSecret: _ms, ...safe } = data;
        return this.prisma.user.update({ where: { id }, data: safe });
    }
    async deactivate(firmId, id) {
        await this.findOne(firmId, id);
        return this.prisma.user.update({ where: { id }, data: { isActive: false } });
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
