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
exports.BillingService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../../prisma/prisma.service");
const stripe_1 = require("stripe");
let BillingService = class BillingService {
    constructor(prisma, config) {
        this.prisma = prisma;
        this.config = config;
        this.stripe = new stripe_1.default(this.config.getOrThrow('STRIPE_SECRET_KEY'), {
            apiVersion: '2024-04-10',
        });
    }
    getTimeEntries(firmId, query) {
        const { caseId, userId, dateFrom, dateTo, billable } = query;
        return this.prisma.timeEntry.findMany({
            where: {
                firmId,
                ...(caseId && { caseId }),
                ...(userId && { userId }),
                ...(billable !== undefined && { isBillable: billable === 'true' }),
                ...(dateFrom && dateTo && { date: { gte: new Date(dateFrom), lte: new Date(dateTo) } }),
            },
            orderBy: { date: 'desc' },
            include: {
                user: { select: { id: true, firstName: true, lastName: true } },
                case: { select: { id: true, title: true, internalRef: true } },
            },
        });
    }
    createTimeEntry(firmId, userId, data) {
        return this.prisma.timeEntry.create({
            data: {
                firmId,
                userId,
                caseId: data.caseId,
                description: data.description,
                durationMinutes: data.durationMinutes,
                hourlyRate: data.hourlyRate,
                isBillable: data.isBillable ?? true,
                date: new Date(data.date),
            },
            include: {
                user: { select: { id: true, firstName: true, lastName: true } },
                case: { select: { id: true, title: true, internalRef: true } },
            },
        });
    }
    async updateTimeEntry(firmId, id, data) {
        const entry = await this.prisma.timeEntry.findFirst({ where: { id, firmId } });
        if (!entry)
            throw new common_1.NotFoundException('Time entry not found');
        return this.prisma.timeEntry.update({ where: { id }, data: data });
    }
    async deleteTimeEntry(firmId, id) {
        const entry = await this.prisma.timeEntry.findFirst({ where: { id, firmId } });
        if (!entry)
            throw new common_1.NotFoundException('Time entry not found');
        return this.prisma.timeEntry.delete({ where: { id } });
    }
    async getInvoices(firmId, query) {
        const { status, clientId } = query;
        const invoices = await this.prisma.invoice.findMany({
            where: { firmId, ...(status && { status: status }), ...(clientId && { clientId }) },
            orderBy: { createdAt: 'desc' },
            include: { case: { select: { id: true, title: true, internalRef: true } } },
        });
        const clientIds = [...new Set(invoices.map((i) => i.clientId))];
        const clients = await this.prisma.client.findMany({
            where: { id: { in: clientIds }, firmId },
            select: { id: true, firstName: true, lastName: true, email: true },
        });
        const clientMap = Object.fromEntries(clients.map((c) => [c.id, c]));
        return invoices.map((inv) => ({ ...inv, client: clientMap[inv.clientId] ?? null }));
    }
    async createInvoice(firmId, data) {
        const year = new Date().getFullYear();
        const count = await this.prisma.invoice.count({ where: { firmId } });
        const firm = await this.prisma.firm.findUniqueOrThrow({ where: { id: firmId } });
        const invoiceNumber = `${firm.slug.toUpperCase()}-INV-${year}-${String(count + 1).padStart(4, '0')}`;
        return this.prisma.invoice.create({
            data: {
                firmId,
                invoiceNumber,
                caseId: data.caseId,
                clientId: data.clientId,
                lineItems: data.lineItems,
                subtotal: data.subtotal,
                tax: data.tax ?? '0',
                total: data.total,
                dueDate: new Date(data.dueDate),
                notes: data.notes,
            },
            include: { case: { select: { id: true, title: true, internalRef: true } } },
        });
    }
    async getInvoice(firmId, id) {
        const invoice = await this.prisma.invoice.findFirst({
            where: { id, firmId },
            include: { case: { select: { id: true, title: true, internalRef: true, status: true } } },
        });
        if (!invoice)
            throw new common_1.NotFoundException('Invoice not found');
        const client = await this.prisma.client.findFirst({
            where: { id: invoice.clientId, firmId },
            select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        });
        return { ...invoice, client };
    }
    async updateInvoice(firmId, id, data) {
        await this.getInvoice(firmId, id);
        return this.prisma.invoice.update({ where: { id }, data: data });
    }
    async sendInvoice(firmId, id) {
        const invoice = await this.getInvoice(firmId, id);
        if (invoice.status === 'PAID')
            throw new common_1.BadRequestException('Invoice is already paid');
        if (invoice.status === 'VOID')
            throw new common_1.BadRequestException('Cannot send a void invoice');
        return this.prisma.invoice.update({ where: { id }, data: { status: 'SENT' } });
    }
    async voidInvoice(firmId, id) {
        await this.getInvoice(firmId, id);
        return this.prisma.invoice.update({ where: { id }, data: { status: 'VOID' } });
    }
    async createStripeCheckout(firmId, id) {
        const invoice = await this.getInvoice(firmId, id);
        if (invoice.status === 'PAID')
            throw new common_1.BadRequestException('Invoice is already paid');
        if (invoice.status === 'VOID')
            throw new common_1.BadRequestException('Cannot pay a void invoice');
        const clientName = invoice.client
            ? `${invoice.client.firstName} ${invoice.client.lastName}`
            : 'Client';
        const appUrl = this.config.get('APP_URL') ?? 'http://localhost:3000';
        const session = await this.stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            customer_email: invoice.client?.email ?? undefined,
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        unit_amount: Math.round(Number(invoice.total) * 100),
                        product_data: {
                            name: `Invoice ${invoice.invoiceNumber}`,
                            description: `Legal services — ${invoice.case?.title ?? invoice.caseId} (${clientName})`,
                        },
                    },
                    quantity: 1,
                },
            ],
            metadata: { invoiceId: id, firmId },
            success_url: `${appUrl}/billing/invoices/${id}?paid=true`,
            cancel_url: `${appUrl}/billing/invoices/${id}?cancelled=true`,
        });
        await this.prisma.invoice.update({
            where: { id },
            data: { stripePaymentId: session.id, status: 'SENT' },
        });
        return { url: session.url };
    }
    async handleStripeWebhook(payload, signature) {
        const webhookSecret = this.config.getOrThrow('STRIPE_WEBHOOK_SECRET');
        let event;
        try {
            event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
        }
        catch {
            throw new common_1.BadRequestException('Invalid Stripe webhook signature');
        }
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;
            const invoiceId = session.metadata?.invoiceId;
            if (!invoiceId)
                return;
            await this.prisma.invoice.updateMany({
                where: { id: invoiceId, stripePaymentId: session.id },
                data: { status: 'PAID', paidAt: new Date() },
            });
        }
    }
    async getPaypalAccessToken() {
        const clientId = this.config.getOrThrow('PAYPAL_CLIENT_ID');
        const secret = this.config.getOrThrow('PAYPAL_SECRET');
        const base = this.config.get('PAYPAL_BASE_URL') ?? 'https://api-m.sandbox.paypal.com';
        const res = await fetch(`${base}/v1/oauth2/token`, {
            method: 'POST',
            headers: {
                Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString('base64')}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: 'grant_type=client_credentials',
        });
        if (!res.ok)
            throw new common_1.BadRequestException('Failed to authenticate with PayPal');
        const data = await res.json();
        return data.access_token;
    }
    async createPaypalOrder(firmId, invoiceId) {
        const invoice = await this.getInvoice(firmId, invoiceId);
        if (invoice.status === 'PAID')
            throw new common_1.BadRequestException('Invoice already paid');
        if (invoice.status === 'VOID')
            throw new common_1.BadRequestException('Cannot pay a void invoice');
        const token = await this.getPaypalAccessToken();
        const base = this.config.get('PAYPAL_BASE_URL') ?? 'https://api-m.sandbox.paypal.com';
        const appUrl = this.config.get('APP_URL') ?? 'http://localhost:3000';
        const res = await fetch(`${base}/v2/checkout/orders`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                intent: 'CAPTURE',
                purchase_units: [{
                        reference_id: invoiceId,
                        amount: { currency_code: 'USD', value: Number(invoice.total).toFixed(2) },
                        description: `Legal Services — Invoice ${invoice.invoiceNumber}`,
                    }],
                application_context: {
                    return_url: `${appUrl}/billing/invoices/${invoiceId}?paypalPaid=true`,
                    cancel_url: `${appUrl}/billing/invoices/${invoiceId}`,
                    brand_name: 'Briefli',
                    user_action: 'PAY_NOW',
                },
            }),
        });
        if (!res.ok)
            throw new common_1.BadRequestException('Failed to create PayPal order');
        const order = await res.json();
        const approvalUrl = order.links.find((l) => l.rel === 'approve')?.href ?? '';
        await this.prisma.invoice.update({ where: { id: invoiceId }, data: { paypalOrderId: order.id, status: 'SENT' } });
        return { orderId: order.id, approvalUrl };
    }
    async capturePaypalOrder(firmId, invoiceId, orderId) {
        const invoice = await this.getInvoice(firmId, invoiceId);
        if (invoice.status === 'PAID')
            return { paid: true };
        const token = await this.getPaypalAccessToken();
        const base = this.config.get('PAYPAL_BASE_URL') ?? 'https://api-m.sandbox.paypal.com';
        const res = await fetch(`${base}/v2/checkout/orders/${orderId}/capture`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        if (!res.ok)
            throw new common_1.BadRequestException('Failed to capture PayPal payment');
        const result = await res.json();
        if (result.status === 'COMPLETED') {
            await this.prisma.invoice.update({ where: { id: invoiceId }, data: { status: 'PAID', paidAt: new Date() } });
            return { paid: true };
        }
        return { paid: false };
    }
    async revenueReport(firmId, _query) {
        const invoices = await this.prisma.invoice.findMany({
            where: { firmId, status: 'PAID' },
            select: { total: true, paidAt: true, caseId: true },
        });
        return { invoices };
    }
    async arAging(firmId) {
        const invoices = await this.prisma.invoice.findMany({
            where: { firmId, status: { in: ['SENT', 'VIEWED', 'OVERDUE'] } },
            select: { id: true, invoiceNumber: true, total: true, dueDate: true, status: true, clientId: true },
        });
        return { invoices };
    }
    async billingSummary(firmId) {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        const [outstanding, paidThisMonth, unbilledEntries, overdue] = await Promise.all([
            this.prisma.invoice.aggregate({
                where: { firmId, status: { in: ['SENT', 'VIEWED', 'OVERDUE'] } },
                _sum: { total: true },
                _count: true,
            }),
            this.prisma.invoice.aggregate({
                where: { firmId, status: 'PAID', paidAt: { gte: startOfMonth, lte: endOfMonth } },
                _sum: { total: true },
                _count: true,
            }),
            this.prisma.timeEntry.findMany({
                where: { firmId, isBillable: true, invoiceId: null },
                select: { durationMinutes: true, hourlyRate: true },
            }),
            this.prisma.invoice.findMany({
                where: { firmId, status: { in: ['SENT', 'VIEWED'] }, dueDate: { lt: now } },
                select: { id: true, invoiceNumber: true, total: true, dueDate: true, clientId: true },
                orderBy: { dueDate: 'asc' },
                take: 5,
            }),
        ]);
        const unbilledHours = unbilledEntries.reduce((acc, e) => acc + e.durationMinutes / 60, 0);
        const unbilledValue = unbilledEntries.reduce((acc, e) => acc + (e.durationMinutes / 60) * Number(e.hourlyRate), 0);
        return {
            outstanding: { total: Number(outstanding._sum.total ?? 0), count: outstanding._count },
            paidThisMonth: { total: Number(paidThisMonth._sum.total ?? 0), count: paidThisMonth._count },
            unbilledHours: Math.round(unbilledHours * 10) / 10,
            unbilledValue: Math.round(unbilledValue * 100) / 100,
            overdueInvoices: overdue,
        };
    }
    async getBillingSettings(firmId) {
        const settings = await this.prisma.billingSettings.findUnique({ where: { firmId } });
        if (!settings) {
            return { defaultRate: '0', taxRate: '0', currency: 'USD', replyTo: null };
        }
        return settings;
    }
    async updateBillingSettings(firmId, data) {
        return this.prisma.billingSettings.upsert({
            where: { firmId },
            update: { ...data },
            create: { firmId, ...data },
        });
    }
};
exports.BillingService = BillingService;
exports.BillingService = BillingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], BillingService);
