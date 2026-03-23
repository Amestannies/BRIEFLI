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
exports.PortalTokenGuard = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let PortalTokenGuard = class PortalTokenGuard {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async canActivate(context) {
        const req = context.switchToHttp().getRequest();
        const token = req.headers['x-portal-token'] ??
            req.query['token'];
        if (!token)
            throw new common_1.UnauthorizedException('Portal token required');
        const client = await this.prisma.client.findUnique({
            where: { portalToken: token },
            select: { id: true, firmId: true, portalToken: true, portalEnabled: true },
        });
        if (!client || !client.portalEnabled) {
            throw new common_1.UnauthorizedException('Invalid or disabled portal token');
        }
        req['portalClient'] = {
            clientId: client.id,
            firmId: client.firmId,
            portalToken: client.portalToken,
        };
        return true;
    }
};
exports.PortalTokenGuard = PortalTokenGuard;
exports.PortalTokenGuard = PortalTokenGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PortalTokenGuard);
