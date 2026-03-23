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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalendarController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const calendar_service_1 = require("./calendar.service");
let CalendarController = class CalendarController {
    constructor(calendarService) {
        this.calendarService = calendarService;
    }
    findAll(user, query) {
        return this.calendarService.findAll(user.firmId, query);
    }
    create(user, body) {
        return this.calendarService.create(user.firmId, user.id, body);
    }
    update(user, id, body) {
        return this.calendarService.update(user.firmId, id, body);
    }
    remove(user, id) {
        return this.calendarService.remove(user.firmId, id);
    }
    getUpcoming(user) {
        return this.calendarService.getUpcoming(user.firmId);
    }
    integrationStatus(user) {
        return this.calendarService.getIntegrationStatus(user.id);
    }
    googleConnect(user) {
        return this.calendarService.getGoogleAuthUrl(user.id);
    }
    async googleCallback(code, userId, res) {
        const redirectUrl = await this.calendarService.handleGoogleCallback(code, userId);
        res.redirect(redirectUrl);
    }
    syncGoogle(user) {
        return this.calendarService.syncFromGoogle(user.id, user.firmId);
    }
    pushToGoogle(user, id) {
        return this.calendarService.pushToGoogle(user.firmId, user.id, id);
    }
    googleDisconnect(user) {
        return this.calendarService.disconnectGoogle(user.id);
    }
    outlookConnect(user) {
        return this.calendarService.getOutlookAuthUrl(user.id);
    }
    async outlookCallback(code, userId, res) {
        const redirectUrl = await this.calendarService.handleOutlookCallback(code, userId);
        res.redirect(redirectUrl);
    }
    syncOutlook(user) {
        return this.calendarService.syncFromOutlook(user.id, user.firmId);
    }
    pushToOutlook(user, id) {
        return this.calendarService.pushToOutlook(user.firmId, user.id, id);
    }
    outlookDisconnect(user) {
        return this.calendarService.disconnectOutlook(user.id);
    }
};
exports.CalendarController = CalendarController;
__decorate([
    (0, common_1.Get)('events'),
    openapi.ApiResponse({ status: 200, type: [Object] }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], CalendarController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)('events'),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], CalendarController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)('events/:id'),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], CalendarController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)('events/:id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    openapi.ApiResponse({ status: common_1.HttpStatus.NO_CONTENT }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], CalendarController.prototype, "remove", null);
__decorate([
    (0, common_1.Get)('upcoming'),
    openapi.ApiResponse({ status: 200, type: [Object] }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CalendarController.prototype, "getUpcoming", null);
__decorate([
    (0, common_1.Get)('integrations/status'),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CalendarController.prototype, "integrationStatus", null);
__decorate([
    (0, common_1.Post)('google/connect'),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CalendarController.prototype, "googleConnect", null);
__decorate([
    openapi.ApiOperation({ description: "OAuth2 callback \u2014 no JwtAuthGuard, userId comes from state param" }),
    (0, common_1.Get)('google/callback'),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Query)('code')),
    __param(1, (0, common_1.Query)('state')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], CalendarController.prototype, "googleCallback", null);
__decorate([
    (0, common_1.Post)('google/sync'),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CalendarController.prototype, "syncGoogle", null);
__decorate([
    (0, common_1.Post)('events/:id/push-google'),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], CalendarController.prototype, "pushToGoogle", null);
__decorate([
    (0, common_1.Post)('google/disconnect'),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CalendarController.prototype, "googleDisconnect", null);
__decorate([
    (0, common_1.Post)('outlook/connect'),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CalendarController.prototype, "outlookConnect", null);
__decorate([
    (0, common_1.Get)('outlook/callback'),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Query)('code')),
    __param(1, (0, common_1.Query)('state')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], CalendarController.prototype, "outlookCallback", null);
__decorate([
    (0, common_1.Post)('outlook/sync'),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CalendarController.prototype, "syncOutlook", null);
__decorate([
    (0, common_1.Post)('events/:id/push-outlook'),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], CalendarController.prototype, "pushToOutlook", null);
__decorate([
    (0, common_1.Post)('outlook/disconnect'),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CalendarController.prototype, "outlookDisconnect", null);
exports.CalendarController = CalendarController = __decorate([
    (0, common_1.Controller)('calendar'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [calendar_service_1.CalendarService])
], CalendarController);
