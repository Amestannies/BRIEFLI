import { Injectable, UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import Stripe from 'stripe';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ClientPortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  // ─── Auth ──────────────────────────────────────────────────────────────────

  async validateToken(token: string): Promise<{
    clientId: string;
    firmId: string;
    firstName: string;
    lastName: string;
    email: string;
  }> {
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
      throw new UnauthorizedException('Invalid or disabled portal token');
    }
    return {
      clientId: client.id,
      firmId: client.firmId,
      firstName: client.firstName,
      lastName: client.lastName,
      email: client.email,
    };
  }

  // ─── Profile ───────────────────────────────────────────────────────────────

  async getProfile(clientId: string) {
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

  // ─── Case ──────────────────────────────────────────────────────────────────

  async getCase(clientId: string, caseId: string) {
    // Verify client has access to this case
    const caseClient = await this.prisma.caseClient.findUnique({
      where: { caseId_clientId: { caseId, clientId } },
    });
    if (!caseClient) {
      throw new NotFoundException('Case not found or access denied');
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
      throw new NotFoundException('Case not found');
    }

    return caseData;
  }

  // ─── Case Updates ──────────────────────────────────────────────────────────

  async getCaseUpdates(caseId: string) {
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

  // ─── Documents ─────────────────────────────────────────────────────────────

  async getDocuments(clientId: string, caseId?: string) {
    // Get all case IDs the client has access to
    const clientCases = await this.prisma.caseClient.findMany({
      where: { clientId },
      select: { caseId: true },
    });
    const caseIds = clientCases.map((cc) => cc.caseId);

    const where: Record<string, unknown> = {
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

  // ─── Document Requests ─────────────────────────────────────────────────────

  async getDocumentRequests(clientId: string) {
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

  // ─── Upload ────────────────────────────────────────────────────────────────

  async getUploadUrl(
    clientId: string,
    firmId: string,
    data: { fileName: string; mimeType: string; folder?: string },
  ): Promise<{ uploadUrl: string; fileKey: string }> {
    const bucket = this.config.getOrThrow<string>('S3_BUCKET');
    const region = this.config.get<string>('S3_REGION') ?? this.config.get<string>('AWS_REGION') ?? 'us-east-1';

    const s3 = new S3Client({
      region,
      credentials: {
        accessKeyId: this.config.get<string>('AWS_ACCESS_KEY_ID') ?? '',
        secretAccessKey: this.config.get<string>('AWS_SECRET_ACCESS_KEY') ?? '',
      },
    });

    const fileKey = `portal/${clientId}/${Date.now()}-${data.fileName}`;

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: fileKey,
      ContentType: data.mimeType,
      ServerSideEncryption: 'AES256',
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
    return { uploadUrl, fileKey };
  }

  async confirmUpload(
    clientId: string,
    firmId: string,
    data: {
      fileKey: string;
      fileName: string;
      mimeType: string;
      fileSize: number;
      caseId?: string;
      documentRequestId?: string;
    },
  ) {
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

  // ─── Invoices ──────────────────────────────────────────────────────────────

  async getInvoices(clientId: string) {
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

  async createStripeCheckout(clientId: string, invoiceId: string): Promise<{ url: string }> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, clientId, status: { notIn: ['PAID', 'VOID'] } },
      include: { case: { select: { title: true } } },
    });
    if (!invoice) throw new NotFoundException('Invoice not found or already paid/void');

    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { email: true, firstName: true, lastName: true },
    });
    if (!client) throw new NotFoundException('Client not found');

    const stripeKey = this.config.getOrThrow<string>('STRIPE_SECRET_KEY');
    const appUrl = this.config.get<string>('APP_URL') ?? 'http://localhost:3000';

    const stripe = new Stripe(stripeKey, { apiVersion: '2024-04-10' });

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

  async createPaypalOrder(
    clientId: string,
    invoiceId: string,
  ): Promise<{ orderId: string; approvalUrl: string }> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, clientId, status: { notIn: ['PAID', 'VOID'] } },
    });
    if (!invoice) throw new NotFoundException('Invoice not found or already paid/void');

    const clientId_ = this.config.getOrThrow<string>('PAYPAL_CLIENT_ID');
    const secret = this.config.getOrThrow<string>('PAYPAL_SECRET');
    const base = this.config.get<string>('PAYPAL_BASE_URL') ?? 'https://api-m.sandbox.paypal.com';
    const appUrl = this.config.get<string>('APP_URL') ?? 'http://localhost:3000';

    // Get access token
    const tokenRes = await fetch(`${base}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId_}:${secret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    if (!tokenRes.ok) throw new BadRequestException('Failed to authenticate with PayPal');
    const tokenData = (await tokenRes.json()) as { access_token: string };

    // Create order
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
    if (!orderRes.ok) throw new BadRequestException('Failed to create PayPal order');

    const order = (await orderRes.json()) as {
      id: string;
      links: Array<{ href: string; rel: string }>;
    };

    const approvalUrl = order.links.find((l) => l.rel === 'approve')?.href ?? '';

    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { paypalOrderId: order.id },
    });

    return { orderId: order.id, approvalUrl };
  }

  async capturePaypalOrder(
    clientId: string,
    invoiceId: string,
    orderId: string,
  ): Promise<{ paid: boolean }> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, clientId },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.status === 'PAID') return { paid: true };

    const clientId_ = this.config.getOrThrow<string>('PAYPAL_CLIENT_ID');
    const secret = this.config.getOrThrow<string>('PAYPAL_SECRET');
    const base = this.config.get<string>('PAYPAL_BASE_URL') ?? 'https://api-m.sandbox.paypal.com';

    const tokenRes = await fetch(`${base}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId_}:${secret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    if (!tokenRes.ok) throw new BadRequestException('Failed to authenticate with PayPal');
    const tokenData = (await tokenRes.json()) as { access_token: string };

    const captureRes = await fetch(`${base}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!captureRes.ok) throw new BadRequestException('Failed to capture PayPal payment');

    const result = (await captureRes.json()) as { status: string };
    if (result.status === 'COMPLETED') {
      await this.prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: 'PAID', paidAt: new Date() },
      });
      return { paid: true };
    }
    return { paid: false };
  }

  // ─── Messages ──────────────────────────────────────────────────────────────

  async getMessages(clientId: string, caseId?: string) {
    return this.prisma.portalMessage.findMany({
      where: { clientId, ...(caseId ? { caseId } : {}) },
      orderBy: { createdAt: 'asc' },
    });
  }

  async sendMessage(
    clientId: string,
    firmId: string,
    data: { body: string; caseId?: string },
  ) {
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

  // ─── Meetings ──────────────────────────────────────────────────────────────

  async getMeetings(clientId: string, firmId?: string) {
    const where: Record<string, unknown> = {};
    if (firmId) {
      where['firmId'] = firmId;
    } else {
      where['clientId'] = clientId;
    }
    return this.prisma.meeting.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async requestMeeting(
    clientId: string,
    firmId: string,
    data: {
      title: string;
      notes?: string;
      caseId?: string;
      proposedTimes?: string[];
      durationMinutes?: number;
    },
  ) {
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

  async confirmMeeting(
    firmId: string,
    meetingId: string,
    data: { confirmedTime: string; meetingLink?: string; attorneyId?: string },
  ) {
    const meeting = await this.prisma.meeting.findFirst({
      where: { id: meetingId, firmId },
    });
    if (!meeting) throw new NotFoundException('Meeting not found');

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

  async declineMeeting(
    firmId: string,
    meetingId: string,
    data: { notes?: string },
  ) {
    const meeting = await this.prisma.meeting.findFirst({
      where: { id: meetingId, firmId },
    });
    if (!meeting) throw new NotFoundException('Meeting not found');

    return this.prisma.meeting.update({
      where: { id: meetingId },
      data: { status: 'DECLINED', notes: data.notes ?? null },
    });
  }

  // ─── Document Requests (attorney-side) ────────────────────────────────────

  async createDocumentRequest(
    firmId: string,
    data: {
      caseId: string;
      clientId: string;
      createdById: string;
      title: string;
      description?: string;
      dueDate?: string;
    },
  ) {
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

  // ─── Activity ──────────────────────────────────────────────────────────────

  async getPortalActivity(firmId: string, clientId: string) {
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

  // ─── Attorney: Document Requests for a Client ──────────────────────────────

  async getClientDocumentRequests(firmId: string, clientId: string) {
    return this.prisma.documentRequest.findMany({
      where: { firmId, clientId },
      orderBy: { createdAt: 'desc' },
      include: {
        case: { select: { title: true, internalRef: true } },
      },
    });
  }

  // ─── Portal Token Retrieval ─────────────────────────────────────────────────

  async getPortalToken(firmId: string, clientId: string) {
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, firmId },
      select: { portalToken: true, portalEnabled: true },
    });
    if (!client || !client.portalEnabled || !client.portalToken) {
      throw new BadRequestException('Portal is not enabled for this client');
    }
    const appUrl = this.config.get<string>('APP_URL') ?? 'http://localhost:3000';
    return {
      portalToken: client.portalToken,
      portalUrl: `${appUrl}/portal?token=${client.portalToken}`,
    };
  }

  // ─── Portal Enable/Disable ─────────────────────────────────────────────────

  async enablePortal(
    firmId: string,
    clientId: string,
  ): Promise<{ portalToken: string; portalUrl: string }> {
    const portalToken = crypto.randomBytes(32).toString('hex');
    const appUrl = this.config.get<string>('APP_URL') ?? 'http://localhost:3000';

    await this.prisma.client.update({
      where: { id: clientId },
      data: { portalEnabled: true, portalToken },
    });

    return {
      portalToken,
      portalUrl: `${appUrl}/portal?token=${portalToken}`,
    };
  }

  async disablePortal(firmId: string, clientId: string): Promise<{ success: boolean }> {
    await this.prisma.client.update({
      where: { id: clientId },
      data: { portalEnabled: false, portalToken: null },
    });
    return { success: true };
  }
}
