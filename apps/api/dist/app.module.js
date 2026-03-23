"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const throttler_1 = require("@nestjs/throttler");
const prisma_module_1 = require("./prisma/prisma.module");
const auth_module_1 = require("./modules/auth/auth.module");
const users_module_1 = require("./modules/users/users.module");
const firms_module_1 = require("./modules/firms/firms.module");
const cases_module_1 = require("./modules/cases/cases.module");
const documents_module_1 = require("./modules/documents/documents.module");
const calendar_module_1 = require("./modules/calendar/calendar.module");
const billing_module_1 = require("./modules/billing/billing.module");
const client_portal_module_1 = require("./modules/client-portal/client-portal.module");
const ecourts_module_1 = require("./modules/ecourts/ecourts.module");
const notifications_module_1 = require("./modules/notifications/notifications.module");
const reports_module_1 = require("./modules/reports/reports.module");
const clients_module_1 = require("./modules/clients/clients.module");
const chat_module_1 = require("./modules/chat/chat.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: ['../../.env.local', '../../.env', '.env'],
            }),
            throttler_1.ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
            prisma_module_1.PrismaModule,
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            firms_module_1.FirmsModule,
            cases_module_1.CasesModule,
            clients_module_1.ClientsModule,
            documents_module_1.DocumentsModule,
            calendar_module_1.CalendarModule,
            billing_module_1.BillingModule,
            client_portal_module_1.ClientPortalModule,
            ecourts_module_1.EcourtsModule,
            notifications_module_1.NotificationsModule,
            reports_module_1.ReportsModule,
            chat_module_1.ChatModule,
        ],
    })
], AppModule);
