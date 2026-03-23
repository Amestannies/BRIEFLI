"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientPortalModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_portal_controller_1 = require("./client-portal.controller");
const client_portal_service_1 = require("./client-portal.service");
const portal_token_guard_1 = require("./portal-token.guard");
const prisma_module_1 = require("../../prisma/prisma.module");
let ClientPortalModule = class ClientPortalModule {
};
exports.ClientPortalModule = ClientPortalModule;
exports.ClientPortalModule = ClientPortalModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, config_1.ConfigModule],
        controllers: [client_portal_controller_1.ClientPortalController],
        providers: [client_portal_service_1.ClientPortalService, portal_token_guard_1.PortalTokenGuard],
        exports: [client_portal_service_1.ClientPortalService],
    })
], ClientPortalModule);
