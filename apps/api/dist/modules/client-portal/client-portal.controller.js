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
exports.ClientPortalController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const portal_token_guard_1 = require("./portal-token.guard");
const portal_client_decorator_1 = require("./portal-client.decorator");
const client_portal_service_1 = require("./client-portal.service");
let ClientPortalController = class ClientPortalController {
    constructor(clientPortalService) {
        this.clientPortalService = clientPortalService;
    }
    validateToken(token) {
        return this.clientPortalService.validateToken(token);
    }
    async stripeWebhook(req) {
        const event = req.body;
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;
            const { invoiceId } = session.metadata;
            if (invoiceId) {
            }
        }
        return { received: true };
    }
    getMe(portalClient) {
        return this.clientPortalService.getProfile(portalClient.clientId);
    }
    getCase(portalClient, caseId) {
        return this.clientPortalService.getCase(portalClient.clientId, caseId);
    }
    getCaseUpdates(caseId) {
        return this.clientPortalService.getCaseUpdates(caseId);
    }
    getDocuments(portalClient, caseId) {
        return this.clientPortalService.getDocuments(portalClient.clientId, caseId);
    }
    getDocumentRequests(portalClient) {
        return this.clientPortalService.getDocumentRequests(portalClient.clientId);
    }
    getUploadUrl(portalClient, body) {
        return this.clientPortalService.getUploadUrl(portalClient.clientId, portalClient.firmId, body);
    }
    confirmUpload(portalClient, body) {
        return this.clientPortalService.confirmUpload(portalClient.clientId, portalClient.firmId, body);
    }
    getInvoices(portalClient) {
        return this.clientPortalService.getInvoices(portalClient.clientId);
    }
    createStripeCheckout(portalClient, id) {
        return this.clientPortalService.createStripeCheckout(portalClient.clientId, id);
    }
    createPaypalOrder(portalClient, id) {
        return this.clientPortalService.createPaypalOrder(portalClient.clientId, id);
    }
    capturePaypalOrder(portalClient, id, body) {
        return this.clientPortalService.capturePaypalOrder(portalClient.clientId, id, body.orderId);
    }
    getMessages(portalClient, caseId) {
        return this.clientPortalService.getMessages(portalClient.clientId, caseId);
    }
    sendMessage(portalClient, body) {
        return this.clientPortalService.sendMessage(portalClient.clientId, portalClient.firmId, {
            body: body.body,
            caseId: body.caseId,
        });
    }
    getMeetings(portalClient) {
        return this.clientPortalService.getMeetings(portalClient.clientId);
    }
    requestMeeting(portalClient, body) {
        return this.clientPortalService.requestMeeting(portalClient.clientId, portalClient.firmId, body);
    }
    async getPortalToken(user, clientId) {
        return this.clientPortalService.getPortalToken(user.firmId, clientId);
    }
    enablePortal(user, clientId) {
        return this.clientPortalService.enablePortal(user.firmId, clientId);
    }
    disablePortal(user, clientId) {
        return this.clientPortalService.disablePortal(user.firmId, clientId);
    }
    createDocumentRequest(user, body) {
        return this.clientPortalService.createDocumentRequest(user.firmId, {
            ...body,
            createdById: user.id,
        });
    }
    getPortalActivity(user, clientId) {
        return this.clientPortalService.getPortalActivity(user.firmId, clientId);
    }
    getClientDocumentRequests(user, clientId) {
        return this.clientPortalService.getClientDocumentRequests(user.firmId, clientId);
    }
    getFirmMeetings(user) {
        return this.clientPortalService.getMeetings('', user.firmId);
    }
    confirmMeeting(user, id, body) {
        return this.clientPortalService.confirmMeeting(user.firmId, id, body);
    }
    declineMeeting(user, id, body) {
        return this.clientPortalService.declineMeeting(user.firmId, id, body);
    }
};
exports.ClientPortalController = ClientPortalController;
__decorate([
    (0, common_1.Get)('auth'),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Query)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ClientPortalController.prototype, "validateToken", null);
__decorate([
    (0, common_1.Post)('stripe/webhook'),
    (0, common_1.HttpCode)(200),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ClientPortalController.prototype, "stripeWebhook", null);
__decorate([
    (0, common_1.Get)('me'),
    (0, common_1.UseGuards)(portal_token_guard_1.PortalTokenGuard),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, portal_client_decorator_1.CurrentPortalClient)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ClientPortalController.prototype, "getMe", null);
__decorate([
    (0, common_1.Get)('cases/:caseId'),
    (0, common_1.UseGuards)(portal_token_guard_1.PortalTokenGuard),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, portal_client_decorator_1.CurrentPortalClient)()),
    __param(1, (0, common_1.Param)('caseId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ClientPortalController.prototype, "getCase", null);
__decorate([
    (0, common_1.Get)('cases/:caseId/updates'),
    (0, common_1.UseGuards)(portal_token_guard_1.PortalTokenGuard),
    openapi.ApiResponse({ status: 200, type: [Object] }),
    __param(0, (0, common_1.Param)('caseId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ClientPortalController.prototype, "getCaseUpdates", null);
__decorate([
    (0, common_1.Get)('documents'),
    (0, common_1.UseGuards)(portal_token_guard_1.PortalTokenGuard),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, portal_client_decorator_1.CurrentPortalClient)()),
    __param(1, (0, common_1.Query)('caseId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ClientPortalController.prototype, "getDocuments", null);
__decorate([
    (0, common_1.Get)('document-requests'),
    (0, common_1.UseGuards)(portal_token_guard_1.PortalTokenGuard),
    openapi.ApiResponse({ status: 200, type: [Object] }),
    __param(0, (0, portal_client_decorator_1.CurrentPortalClient)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ClientPortalController.prototype, "getDocumentRequests", null);
__decorate([
    (0, common_1.Post)('documents/upload-url'),
    (0, common_1.UseGuards)(portal_token_guard_1.PortalTokenGuard),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, portal_client_decorator_1.CurrentPortalClient)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ClientPortalController.prototype, "getUploadUrl", null);
__decorate([
    (0, common_1.Post)('documents/confirm'),
    (0, common_1.UseGuards)(portal_token_guard_1.PortalTokenGuard),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, portal_client_decorator_1.CurrentPortalClient)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ClientPortalController.prototype, "confirmUpload", null);
__decorate([
    (0, common_1.Get)('invoices'),
    (0, common_1.UseGuards)(portal_token_guard_1.PortalTokenGuard),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, portal_client_decorator_1.CurrentPortalClient)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ClientPortalController.prototype, "getInvoices", null);
__decorate([
    (0, common_1.Post)('invoices/:id/checkout/stripe'),
    (0, common_1.UseGuards)(portal_token_guard_1.PortalTokenGuard),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, portal_client_decorator_1.CurrentPortalClient)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ClientPortalController.prototype, "createStripeCheckout", null);
__decorate([
    (0, common_1.Post)('invoices/:id/checkout/paypal'),
    (0, common_1.UseGuards)(portal_token_guard_1.PortalTokenGuard),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, portal_client_decorator_1.CurrentPortalClient)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ClientPortalController.prototype, "createPaypalOrder", null);
__decorate([
    (0, common_1.Post)('invoices/:id/paypal/capture'),
    (0, common_1.UseGuards)(portal_token_guard_1.PortalTokenGuard),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, portal_client_decorator_1.CurrentPortalClient)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], ClientPortalController.prototype, "capturePaypalOrder", null);
__decorate([
    (0, common_1.Get)('messages'),
    (0, common_1.UseGuards)(portal_token_guard_1.PortalTokenGuard),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, portal_client_decorator_1.CurrentPortalClient)()),
    __param(1, (0, common_1.Query)('caseId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ClientPortalController.prototype, "getMessages", null);
__decorate([
    (0, common_1.Post)('messages'),
    (0, common_1.UseGuards)(portal_token_guard_1.PortalTokenGuard),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, portal_client_decorator_1.CurrentPortalClient)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ClientPortalController.prototype, "sendMessage", null);
__decorate([
    (0, common_1.Get)('meetings'),
    (0, common_1.UseGuards)(portal_token_guard_1.PortalTokenGuard),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, portal_client_decorator_1.CurrentPortalClient)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ClientPortalController.prototype, "getMeetings", null);
__decorate([
    (0, common_1.Post)('meetings/request'),
    (0, common_1.UseGuards)(portal_token_guard_1.PortalTokenGuard),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, portal_client_decorator_1.CurrentPortalClient)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ClientPortalController.prototype, "requestMeeting", null);
__decorate([
    (0, common_1.Get)('clients/:clientId/token'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('clientId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ClientPortalController.prototype, "getPortalToken", null);
__decorate([
    (0, common_1.Post)('clients/:clientId/enable'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('clientId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ClientPortalController.prototype, "enablePortal", null);
__decorate([
    (0, common_1.Post)('clients/:clientId/disable'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('clientId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ClientPortalController.prototype, "disablePortal", null);
__decorate([
    (0, common_1.Post)('document-requests'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ClientPortalController.prototype, "createDocumentRequest", null);
__decorate([
    (0, common_1.Get)('clients/:clientId/activity'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('clientId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ClientPortalController.prototype, "getPortalActivity", null);
__decorate([
    (0, common_1.Get)('clients/:clientId/document-requests'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    openapi.ApiResponse({ status: 200, type: [Object] }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('clientId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ClientPortalController.prototype, "getClientDocumentRequests", null);
__decorate([
    (0, common_1.Get)('firm/meetings'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ClientPortalController.prototype, "getFirmMeetings", null);
__decorate([
    (0, common_1.Post)('meetings/:id/confirm'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], ClientPortalController.prototype, "confirmMeeting", null);
__decorate([
    (0, common_1.Post)('meetings/:id/decline'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], ClientPortalController.prototype, "declineMeeting", null);
exports.ClientPortalController = ClientPortalController = __decorate([
    (0, common_1.Controller)('portal'),
    __metadata("design:paramtypes", [client_portal_service_1.ClientPortalService])
], ClientPortalController);
