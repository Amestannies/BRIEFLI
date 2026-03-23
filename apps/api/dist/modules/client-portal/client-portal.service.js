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
exports.ClientPortalService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const crypto = require("crypto");
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const stripe_1 = require("stripe");
const prisma_service_1 = require("../../prisma/prisma.service");
let ClientPortalService = class ClientPortalService {
    constructor(prisma, config) {
        this.prisma = prisma;
        this.config = config;
    }
    async validateToken(token) {
        const client = await this.prisma.client.findUnique({
            where: { portalToken: token },
            select: {
                id: true,
                firmId: true,
                portalEnabled: true,
                firstName: true,
                lastName: true,
                email: true,
            },
        });
        if (!client || !client.portalEnabled) {
            throw new common_1.UnauthorizedException('Invalid or disabled portal token');
        }
        return {
            clientId: client.id,
            firmId: client.firmId,
            firstName: client.firstName,
            lastName: client.lastName,
            email: client.email,
        };
    }
    async getProfile(clientId) {
        const client = await this.prisma.client.findUnique({
            where: { id: clientId },
            include: {
                cases: {
                    include: {
                        case: {
                            select: {
                                id: true,
                                title: true,
                                status: true,
                                internalRef: true,
                                caseType: true,
                                openDate: true,
                                _count: {
                                    select: {
                                        invoices: true,
                                        documents: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });
        return client;
    }
    async getCase(clientId, caseId) {
        const caseClient = await this.prisma.caseClient.findUnique({
            where: { caseId_clientId: { caseId, clientId } },
        });
        if (!caseClient) {
            throw new common_1.NotFoundException('Case not found or access denied');
        }
        const now = new Date();
        const caseData = await this.prisma.case.findUnique({
            where: { id: caseId },
            include: {
                milestones: { orderBy: { order: 'asc' } },
                events: {
                    where: { startTime: { gte: now } },
                    orderBy: { startTime: 'asc' },
                    take: 5,
                },
                notes: {
                    where: { isInternal: false },
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                },
                _count: {
                    select: { documents: true },
                },
            },
        });
        if (!caseData) {
            throw new common_1.NotFoundException('Case not found');
        }
        return caseData;
    }
    async getCaseUpdates(caseId) {
        return this.prisma.caseNote.findMany({
            where: { caseId, isInternal: false },
            orderBy: { createdAt: 'desc' },
            take: 20,
            include: {
                case: {
                    select: { id: true, title: true },
                },
            },
        });
    }
    async getDocuments(clientId, caseId) {
        const clientCases = await this.prisma.caseClient.findMany({
            where: { clientId },
            select: { caseId: true },
        });
        const caseIds = clientCases.map((cc) => cc.caseId);
        const where = {
            deletedAt: null,
            OR: [
                { clientId },
                { caseId: { in: caseIds } },
            ],
        };
        if (caseId) {
            where['caseId'] = caseId;
            delete where['OR'];
        }
        return this.prisma.document.findMany({
            where,
            select: {
                id: true,
                fileName: true,
                fileSize: true,
                mimeType: true,
                folder: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getDocumentRequests(clientId) {
        return this.prisma.documentRequest.findMany({
            where: { clientId },
            include: {
                case: {
                    select: { id: true, title: true, internalRef: true },
                },
            },
            orderBy: [
                { dueDate: 'asc' },
                { createdAt: 'desc' },
            ],
        });
    }
    async getUploadUrl(clientId, firmId, data) {
        const bucket = this.config.getOrThrow('S3_BUCKET');
        const region = this.config.get('S3_REGION') ?? this.config.get('AWS_REGION') ?? 'us-east-1';
        const s3 = new client_s3_1.S3Client({
            region,
            credentials: {
                accessKeyId: this.config.get('AWS_ACCESS_KEY_ID') ?? '',
                secretAccessKey: this.config.get('AWS_SECRET_ACCESS_KEY') ?? '',
            },
        });
        const fileKey = `portal/${clientId}/${Date.now()}-${data.fileName}`;
        const command = new client_s3_1.PutObjectCommand({
            Bucket: bucket,
            Key: fileKey,
            ContentType: data.mimeType,
            ServerSideEncryption: 'AES256',
        });
        const uploadUrl = await (0, s3_request_presigner_1.getSignedUrl)(s3, command, { expiresIn: 3600 });
        return { uploadUrl, fileKey };
    }
    async confirmUpload(clientId, firmId, data) {
        const doc = await this.prisma.document.create({
            data: {
                firmId,
                caseId: data.caseId ?? null,
                uploadedById: clientId,
                clientId,
                fileName: data.fileName,
                fileKey: data.fileKey,
                fileSize: data.fileSize,
                mimeType: data.mimeType,
                folder: 'portal-uploads',
                tags: [],
            },
        });
        if (data.documentRequestId) {
            await this.prisma.documentRequest.update({
                where: { id: data.documentRequestId },
                data: { fulfilledAt: new Date(), documentId: doc.id },
            });
        }
        return doc;
    }
    async getInvoices(clientId) {
        return this.prisma.invoice.findMany({
            where: {
                clientId,
                status: { in: ['SENT', 'VIEWED', 'OVERDUE', 'PAID'] },
            },
            select: {
                id: true,
                invoiceNumber: true,
                total: true,
                subtotal: true,
                tax: true,
                dueDate: true,
                paidAt: true,
                status: true,
                stripePaymentId: true,
                paypalOrderId: true,
                notes: true,
                lineItems: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async createStripeCheckout(clientId, invoiceId) {
        const invoice = await this.prisma.invoice.findFirst({
            where: { id: invoiceId, clientId, status: { notIn: ['PAID', 'VOID'] } },
            include: { case: { select: { title: true } } },
        });
        if (!invoice)
            throw new common_1.NotFoundException('Invoice not found or already paid/void');
        const client = await this.prisma.client.findUnique({
            where: { id: clientId },
            select: { email: true, firstName: true, lastName: true },
        });
        if (!client)
            throw new common_1.NotFoundException('Client not found');
        const stripeKey = this.config.getOrThrow('STRIPE_SECRET_KEY');
        const appUrl = this.config.get('APP_URL') ?? 'http://localhost:3000';
        const stripe = new stripe_1.default(stripeKey, { apiVersion: '2024-04-10' });
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            customer_email: client.email,
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: `Invoice ${invoice.invoiceNumber}`,
                            description: `Legal Services — ${invoice.case?.title ?? 'Case'}`,
                        },
                        unit_amount: Math.round(Number(invoice.total) * 100),
                    },
                    quantity: 1,
                },
            ],
            success_url: `${appUrl}/portal?tab=invoices&paid=true&invoice=${invoiceId}`,
            cancel_url: `${appUrl}/portal?tab=invoices`,
            metadata: { invoiceId, clientId },
        });
        await this.prisma.invoice.update({
            where: { id: invoiceId },
            data: { stripePaymentId: session.id, status: 'SENT' },
        });
        return { url: session.url ?? '' };
    }
    async createPaypalOrder(clientId, invoiceId) {
        const invoice = await this.prisma.invoice.findFirst({
            where: { id: invoiceId, clientId, status: { notIn: ['PAID', 'VOID'] } },
        });
        if (!invoice)
            throw new common_1.NotFoundException('Invoice not found or already paid/void');
        const clientId_ = this.config.getOrThrow('PAYPAL_CLIENT_ID');
        const secret = this.config.getOrThrow('PAYPAL_SECRET');
        const base = this.config.get('PAYPAL_BASE_URL') ?? 'https://api-m.sandbox.paypal.com';
        const appUrl = this.config.get('APP_URL') ?? 'http://localhost:3000';
        const tokenRes = await fetch(`${base}/v1/oauth2/token`, {
            method: 'POST',
            headers: {
                Authorization: `Basic ${Buffer.from(`${clientId_}:${secret}`).toString('base64')}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: 'grant_type=client_credentials',
        });
        if (!tokenRes.ok)
            throw new common_1.BadRequestException('Failed to authenticate with PayPal');
        const tokenData = (await tokenRes.json());
        const orderRes = await fetch(`${base}/v2/checkout/orders`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                intent: 'CAPTURE',
                purchase_units: [
                    {
                        reference_id: invoiceId,
                        amount: {
                            currency_code: 'USD',
                            value: invoice.total.toString(),
                        },
                        description: `Legal Services - Invoice ${invoice.invoiceNumber}`,
                    },
                ],
                application_context: {
                    return_url: `${appUrl}/portal?tab=invoices&paypalPaid=true`,
                    cancel_url: `${appUrl}/portal?tab=invoices`,
                    brand_name: 'Briefli',
                    user_action: 'PAY_NOW',
                },
            }),
        });
        if (!orderRes.ok)
            throw new common_1.BadRequestException('Failed to create PayPal order');
        const order = (await orderRes.json());
        const approvalUrl = order.links.find((l) => l.rel === 'approve')?.href ?? '';
        await this.prisma.invoice.update({
            where: { id: invoiceId },
            data: { paypalOrderId: order.id },
        });
        return { orderId: order.id, approvalUrl };
    }
    async capturePaypalOrder(clientId, invoiceId, orderId) {
        const invoice = await this.prisma.invoice.findFirst({
            where: { id: invoiceId, clientId },
        });
        if (!invoice)
            throw new common_1.NotFoundException('Invoice not found');
        if (invoice.status === 'PAID')
            return { paid: true };
        const clientId_ = this.config.getOrThrow('PAYPAL_CLIENT_ID');
        const secret = this.config.getOrThrow('PAYPAL_SECRET');
        const base = this.config.get('PAYPAL_BASE_URL') ?? 'https://api-m.sandbox.paypal.com';
        const tokenRes = await fetch(`${base}/v1/oauth2/token`, {
            method: 'POST',
            headers: {
                Authorization: `Basic ${Buffer.from(`${clientId_}:${secret}`).toString('base64')}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: 'grant_type=client_credentials',
        });
        if (!tokenRes.ok)
            throw new common_1.BadRequestException('Failed to authenticate with PayPal');
        const tokenData = (await tokenRes.json());
        const captureRes = await fetch(`${base}/v2/checkout/orders/${orderId}/capture`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
                'Content-Type': 'application/json',
            },
        });
        if (!captureRes.ok)
            throw new common_1.BadRequestException('Failed to capture PayPal payment');
        const result = (await captureRes.json());
        if (result.status === 'COMPLETED') {
            await this.prisma.invoice.update({
                where: { id: invoiceId },
                data: { status: 'PAID', paidAt: new Date() },
            });
            return { paid: true };
        }
        return { paid: false };
    }
    async getMessages(clientId, caseId) {
        return this.prisma.portalMessage.findMany({
            where: { clientId, ...(caseId ? { caseId } : {}) },
            orderBy: { createdAt: 'asc' },
        });
    }
    async sendMessage(clientId, firmId, data) {
        return this.prisma.portalMessage.create({
            data: {
                firmId,
                clientId,
                caseId: data.caseId ?? null,
                senderId: clientId,
                senderType: 'CLIENT',
                body: data.body,
            },
        });
    }
    async getMeetings(clientId, firmId) {
        const where = {};
        if (firmId) {
            where['firmId'] = firmId;
        }
        else {
            where['clientId'] = clientId;
        }
        return this.prisma.meeting.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });
    }
    async requestMeeting(clientId, firmId, data) {
        return this.prisma.meeting.create({
            data: {
                firmId,
                clientId,
                caseId: data.caseId ?? null,
                requestedByType: 'CLIENT',
                requestedById: clientId,
                title: data.title,
                notes: data.notes ?? null,
                proposedTimes: data.proposedTimes ?? null,
                durationMinutes: data.durationMinutes ?? 60,
            },
        });
    }
    async confirmMeeting(firmId, meetingId, data) {
        const meeting = await this.prisma.meeting.findFirst({
            where: { id: meetingId, firmId },
        });
        if (!meeting)
            throw new common_1.NotFoundException('Meeting not found');
        return this.prisma.meeting.update({
            where: { id: meetingId },
            data: {
                status: 'CONFIRMED',
                confirmedTime: new Date(data.confirmedTime),
                meetingLink: data.meetingLink ?? null,
                attorneyId: data.attorneyId ?? null,
            },
        });
    }
    async declineMeeting(firmId, meetingId, data) {
        const meeting = await this.prisma.meeting.findFirst({
            where: { id: meetingId, firmId },
        });
        if (!meeting)
            throw new common_1.NotFoundException('Meeting not found');
        return this.prisma.meeting.update({
            where: { id: meetingId },
            data: { status: 'DECLINED', notes: data.notes ?? null },
        });
    }
    async createDocumentRequest(firmId, data) {
        return this.prisma.documentRequest.create({
            data: {
                firmId,
                caseId: data.caseId,
                clientId: data.clientId,
                createdById: data.createdById,
                title: data.title,
                description: data.description ?? null,
                dueDate: data.dueDate ? new Date(data.dueDate) : null,
            },
        });
    }
    async getPortalActivity(firmId, clientId) {
        const [messages, meetings] = await Promise.all([
            this.prisma.portalMessage.findMany({
                where: { firmId, clientId },
                orderBy: { createdAt: 'desc' },
                take: 20,
            }),
            this.prisma.meeting.findMany({
                where: { firmId, clientId },
                orderBy: { createdAt: 'desc' },
                take: 10,
            }),
        ]);
        return { messages, meetings };
    }
    async getClientDocumentRequests(firmId, clientId) {
        return this.prisma.documentRequest.findMany({
            where: { firmId, clientId },
            orderBy: { createdAt: 'desc' },
            include: {
                case: { select: { title: true, internalRef: true } },
            },
        });
    }
    async getPortalToken(firmId, clientId) {
        const client = await this.prisma.client.findFirst({
            where: { id: clientId, firmId },
            select: { portalToken: true, portalEnabled: true },
        });
        if (!client || !client.portalEnabled || !client.portalToken) {
            throw new common_1.BadRequestException('Portal is not enabled for this client');
        }
        const appUrl = this.config.get('APP_URL') ?? 'http://localhost:3000';
        return {
            portalToken: client.portalToken,
            portalUrl: `${appUrl}/portal?token=${client.portalToken}`,
        };
    }
    async enablePortal(firmId, clientId) {
        const portalToken = crypto.randomBytes(32).toString('hex');
        const appUrl = this.config.get('APP_URL') ?? 'http://localhost:3000';
        await this.prisma.client.update({
            where: { id: clientId },
            data: { portalEnabled: true, portalToken },
        });
        return {
            portalToken,
            portalUrl: `${appUrl}/portal?token=${portalToken}`,
        };
    }
    async disablePortal(firmId, clientId) {
        await this.prisma.client.update({
            where: { id: clientId },
            data: { portalEnabled: false, portalToken: null },
        });
        return { success: true };
    }
};
exports.ClientPortalService = ClientPortalService;
exports.ClientPortalService = ClientPortalService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], ClientPortalService);
