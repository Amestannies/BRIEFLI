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
exports.EcourtsController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const ecourts_service_1 = require("./ecourts.service");
let EcourtsController = class EcourtsController {
    constructor(ecourtsService) {
        this.ecourtsService = ecourtsService;
    }
    storeCredentials(user, body) {
        return this.ecourtsService.storeCredentials(user.id, body);
    }
    removeCredentials(user) {
        return this.ecourtsService.removeCredentials(user.id);
    }
    credentialStatus(user) {
        return this.ecourtsService.getCredentialStatus(user.id);
    }
    getNotifications(user) {
        return this.ecourtsService.getNotifications(user.firmId, user.id);
    }
    syncNotifications(user) {
        return this.ecourtsService.fetchAndSyncNotifications(user.id, user.firmId);
    }
    importNotification(user, id) {
        return this.ecourtsService.importNotificationToCalendar(user.firmId, user.id, id);
    }
    search(user, body) {
        return this.ecourtsService.search(user.id, body);
    }
    importCase(user, body) {
        return this.ecourtsService.importCase(user.firmId, user.id, body);
    }
    syncCase(user, caseId) {
        return this.ecourtsService.syncCase(user.firmId, user.id, caseId);
    }
};
exports.EcourtsController = EcourtsController;
__decorate([
    (0, common_1.Post)('credentials'),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], EcourtsController.prototype, "storeCredentials", null);
__decorate([
    (0, common_1.Delete)('credentials'),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], EcourtsController.prototype, "removeCredentials", null);
__decorate([
    (0, common_1.Get)('credentials/status'),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], EcourtsController.prototype, "credentialStatus", null);
__decorate([
    (0, common_1.Get)('notifications'),
    openapi.ApiResponse({ status: 200, type: [Object] }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], EcourtsController.prototype, "getNotifications", null);
__decorate([
    (0, common_1.Post)('notifications/sync'),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], EcourtsController.prototype, "syncNotifications", null);
__decorate([
    (0, common_1.Post)('notifications/:id/import'),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], EcourtsController.prototype, "importNotification", null);
__decorate([
    (0, common_1.Post)('search'),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], EcourtsController.prototype, "search", null);
__decorate([
    (0, common_1.Post)('import'),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], EcourtsController.prototype, "importCase", null);
__decorate([
    (0, common_1.Post)('sync/:caseId'),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('caseId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], EcourtsController.prototype, "syncCase", null);
exports.EcourtsController = EcourtsController = __decorate([
    (0, common_1.Controller)('ecourts'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [ecourts_service_1.EcourtsService])
], EcourtsController);
