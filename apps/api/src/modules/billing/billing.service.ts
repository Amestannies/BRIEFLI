import { Injectable, NotFoundException, BadRequestException, RawBodyRequest } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import Stripe from 'stripe';

@Injectable()
export class BillingService {
  private readonly stripe: Stripe;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.stripe = new Stripe(this.config.getOrThrow<string>('STRIPE_SECRET_KEY'), {
      apiVersion: '2024-04-10',
    });
  }

  // ─── Time Entries ─────────────────────────────────────────────────────────

  getTimeEntries(firmId: string, query: Record<string, string>) {
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

  createTimeEntry(firmId: string, userId: string, data: Record<string, unknown>) {
    return this.prisma.timeEntry.create({
      data: {
        firmId,
        userId,
        caseId: data.caseId as string,
        description: data.description as string,
        durationMinutes: data.durationMinutes as number,
        hourlyRate: data.hourlyRate as string,
        isBillable: (data.isBillable as boolean) ?? true,
        date: new Date(data.date as string),
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        case: { select: { id: true, title: true, internalRef: true } },
      },
    });
  }

  async updateTimeEntry(firmId: string, id: string, data: Record<string, unknown>) {
    const entry = await this.prisma.timeEntry.findFirst({ where: { id, firmId } });
    if (!entry) throw new NotFoundException('Time entry not found');
    return this.prisma.timeEntry.update({ where: { id }, data: data as never });
  }

  async deleteTimeEntry(firmId: string, id: string) {
    const entry = await this.prisma.timeEntry.findFirst({ where: { id, firmId } });
    if (!entry) throw new NotFoundException('Time entry not found');
    return this.prisma.timeEntry.delete({ where: { id } });
  }

  // ─── Invoices ─────────────────────────────────────────────────────────────

  async getInvoices(firmId: string, query: Record<string, string>) {
    const { status, clientId } = query;
    const invoices = await this.prisma.invoice.findMany({
      where: { firmId, ...(status && { status: status as never }), ...(clientId && { clientId }) },
      orderBy: { createdAt: 'desc' },
      include: { case: { select: { id: true, title: true, internalRef: true } } },
    });

    // Attach client names via batch lookup (Invoice has no Prisma relation to Client)
    const clientIds = [...new Set(invoices.map((i) => i.clientId))];
    const clients = await this.prisma.client.findMany({
      where: { id: { in: clientIds }, firmId },
      select: { id: true, firstName: true, lastName: true, email: true },
    });
    const clientMap = Object.fromEntries(clients.map((c) => [c.id, c]));

    return invoices.map((inv) => ({ ...inv, client: clientMap[inv.clientId] ?? null }));
  }

  async createInvoice(firmId: string, data: Record<string, unknown>) {
    const year = new Date().getFullYear();
    const count = await this.prisma.invoice.count({ where: { firmId } });
    const firm = await this.prisma.firm.findUniqueOrThrow({ where: { id: firmId } });
    const invoiceNumber = `${firm.slug.toUpperCase()}-INV-${year}-${String(count + 1).padStart(4, '0')}`;

    return this.prisma.invoice.create({
      data: {
        firmId,
        invoiceNumber,
        caseId: data.caseId as string,
        clientId: data.clientId as string,
        lineItems: data.lineItems as never,
        subtotal: data.subtotal as string,
        tax: (data.tax as string) ?? '0',
        total: data.total as string,
        dueDate: new Date(data.dueDate as string),
        notes: data.notes as string | undefined,
      },
      include: { case: { select: { id: true, title: true, internalRef: true } } },
    });
  }

  async getInvoice(firmId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, firmId },
      include: { case: { select: { id: true, title: true, internalRef: true, status: true } } },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');

    const client = await this.prisma.client.findFirst({
      where: { id: invoice.clientId, firmId },
      select: { id: true, firstName: true, lastName: true, email: true, phone: true },
    });

    return { ...invoice, client };
  }

  async updateInvoice(firmId: string, id: string, data: Record<string, unknown>) {
    await this.getInvoice(firmId, id);
    return this.prisma.invoice.update({ where: { id }, data: data as never });
  }

  async sendInvoice(firmId: string, id: string) {
    const invoice = await this.getInvoice(firmId, id);
    if (invoice.status === 'PAID') throw new BadRequestException('Invoice is already paid');
    if (invoice.status === 'VOID') throw new BadRequestException('Cannot send a void invoice');
    return this.prisma.invoice.update({ where: { id }, data: { status: 'SENT' } });
  }

  async voidInvoice(firmId: string, id: string) {
    await this.getInvoice(firmId, id);
    return this.prisma.invoice.update({ where: { id }, data: { status: 'VOID' } });
  }

  // ─── Stripe ───────────────────────────────────────────────────────────────

  async createStripeCheckout(firmId: string, id: string): Promise<{ url: string }> {
    const invoice = await this.getInvoice(firmId, id);
    if (invoice.status === 'PAID') throw new BadRequestException('Invoice is already paid');
    if (invoice.status === 'VOID') throw new BadRequestException('Cannot pay a void invoice');

    const clientName = invoice.client
      ? `${invoice.client.firstName} ${invoice.client.lastName}`
      : 'Client';

    const appUrl = this.config.get<string>('APP_URL') ?? 'http://localhost:3000';

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

    return { url: session.url! };
  }

  async handleStripeWebhook(payload: Buffer, signature: string): Promise<void> {
    const webhookSecret = this.config.getOrThrow<string>('STRIPE_WEBHOOK_SECRET');

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch {
      throw new BadRequestException('Invalid Stripe webhook signature');
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const invoiceId = session.metadata?.invoiceId;
      if (!invoiceId) return;

      await this.prisma.invoice.updateMany({
        where: { id: invoiceId, stripePaymentId: session.id },
        data: { status: 'PAID', paidAt: new Date() },
      });
    }
  }

  // ─── PayPal ────────────────────────────────────────────────────────────────

  private async getPaypalAccessToken(): Promise<string> {
    const clientId = this.config.getOrThrow<string>('PAYPAL_CLIENT_ID');
    const secret   = this.config.getOrThrow<string>('PAYPAL_SECRET');
    const base     = this.config.get<string>('PAYPAL_BASE_URL') ?? 'https://api-m.sandbox.paypal.com';
    const res = await fetch(`${base}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    if (!res.ok) throw new BadRequestException('Failed to authenticate with PayPal');
    const data = await res.json() as { access_token: string };
    return data.access_token;
  }

  async createPaypalOrder(firmId: string, invoiceId: string): Promise<{ orderId: string; approvalUrl: string }> {
    const invoice = await this.getInvoice(firmId, invoiceId);
    if (invoice.status === 'PAID') throw new BadRequestException('Invoice already paid');
    if (invoice.status === 'VOID') throw new BadRequestException('Cannot pay a void invoice');

    const token = await this.getPaypalAccessToken();
    const base  = this.config.get<string>('PAYPAL_BASE_URL') ?? 'https://api-m.sandbox.paypal.com';
    const appUrl = this.config.get<string>('APP_URL') ?? 'http://localhost:3000';

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
          cancel_url:  `${appUrl}/billing/invoices/${invoiceId}`,
          brand_name: 'Briefli',
          user_action: 'PAY_NOW',
        },
      }),
    });
    if (!res.ok) throw new BadRequestException('Failed to create PayPal order');
    const order = await res.json() as { id: string; links: Array<{ href: string; rel: string }> };
    const approvalUrl = order.links.find((l) => l.rel === 'approve')?.href ?? '';

    await this.prisma.invoice.update({ where: { id: invoiceId }, data: { paypalOrderId: order.id, status: 'SENT' } });
    return { orderId: order.id, approvalUrl };
  }

  async capturePaypalOrder(firmId: string, invoiceId: string, orderId: string): Promise<{ paid: boolean }> {
    const invoice = await this.getInvoice(firmId, invoiceId);
    if (invoice.status === 'PAID') return { paid: true };

    const token = await this.getPaypalAccessToken();
    const base  = this.config.get<string>('PAYPAL_BASE_URL') ?? 'https://api-m.sandbox.paypal.com';

    const res = await fetch(`${base}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new BadRequestException('Failed to capture PayPal payment');
    const result = await res.json() as { status: string };

    if (result.status === 'COMPLETED') {
      await this.prisma.invoice.update({ where: { id: invoiceId }, data: { status: 'PAID', paidAt: new Date() } });
      return { paid: true };
    }
    return { paid: false };
  }

  // ─── Reports ──────────────────────────────────────────────────────────────

  async revenueReport(firmId: string, _query: Record<string, string>) {
    const invoices = await this.prisma.invoice.findMany({
      where: { firmId, status: 'PAID' },
      select: { total: true, paidAt: true, caseId: true },
    });
    return { invoices };
  }

  async arAging(firmId: string) {
    const invoices = await this.prisma.invoice.findMany({
      where: { firmId, status: { in: ['SENT', 'VIEWED', 'OVERDUE'] } },
      select: { id: true, invoiceNumber: true, total: true, dueDate: true, status: true, clientId: true },
    });
    return { invoices };
  }

  async billingSummary(firmId: string) {
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
    const unbilledValue = unbilledEntries.reduce(
      (acc, e) => acc + (e.durationMinutes / 60) * Number(e.hourlyRate),
      0,
    );

    return {
      outstanding: { total: Number(outstanding._sum.total ?? 0), count: outstanding._count },
      paidThisMonth: { total: Number(paidThisMonth._sum.total ?? 0), count: paidThisMonth._count },
      unbilledHours: Math.round(unbilledHours * 10) / 10,
      unbilledValue: Math.round(unbilledValue * 100) / 100,
      overdueInvoices: overdue,
    };
  }

  // ─── Billing Settings ───────────────────────────────────────────────────────

  async getBillingSettings(firmId: string) {
    const settings = await this.prisma.billingSettings.findUnique({ where: { firmId } });
    if (!settings) {
      return { defaultRate: '0', taxRate: '0', currency: 'USD', replyTo: null };
    }
    return settings;
  }

  async updateBillingSettings(firmId: string, data: Record<string, unknown>) {
    return this.prisma.billingSettings.upsert({
      where: { firmId },
      update: { ...data } as never,
      create: { firmId, ...data } as never,
    });
  }
}
