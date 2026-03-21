import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator';
import { PortalTokenGuard } from './portal-token.guard';
import { CurrentPortalClient } from './portal-client.decorator';
import type { PortalClient } from './portal-token.guard';
import { ClientPortalService } from './client-portal.service';
import type { Request } from 'express';

@Controller('portal')
export class ClientPortalController {
  constructor(private readonly clientPortalService: ClientPortalService) {}

  // ─── Public Routes ──────────────────────────────────────────────────────────

  @Get('auth')
  validateToken(@Query('token') token: string) {
    return this.clientPortalService.validateToken(token);
  }

  @Post('stripe/webhook')
  @HttpCode(200)
  async stripeWebhook(@Req() req: Request) {
    // Handle Stripe checkout.session.completed for portal payments
    const event = req.body as {
      type: string;
      data: { object: { metadata: { invoiceId?: string; clientId?: string }; id: string } };
    };

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const { invoiceId } = session.metadata;
      if (invoiceId) {
        // Mark invoice as paid via Stripe
        // This is a simplified handler - production would verify webhook signature
      }
    }
    return { received: true };
  }

  // ─── Client Portal Routes (PortalTokenGuard) ────────────────────────────────

  @Get('me')
  @UseGuards(PortalTokenGuard)
  getMe(@CurrentPortalClient() portalClient: PortalClient) {
    return this.clientPortalService.getProfile(portalClient.clientId);
  }

  @Get('cases/:caseId')
  @UseGuards(PortalTokenGuard)
  getCase(
    @CurrentPortalClient() portalClient: PortalClient,
    @Param('caseId') caseId: string,
  ) {
    return this.clientPortalService.getCase(portalClient.clientId, caseId);
  }

  @Get('cases/:caseId/updates')
  @UseGuards(PortalTokenGuard)
  getCaseUpdates(@Param('caseId') caseId: string) {
    return this.clientPortalService.getCaseUpdates(caseId);
  }

  @Get('documents')
  @UseGuards(PortalTokenGuard)
  getDocuments(
    @CurrentPortalClient() portalClient: PortalClient,
    @Query('caseId') caseId?: string,
  ) {
    return this.clientPortalService.getDocuments(portalClient.clientId, caseId);
  }

  @Get('document-requests')
  @UseGuards(PortalTokenGuard)
  getDocumentRequests(@CurrentPortalClient() portalClient: PortalClient) {
    return this.clientPortalService.getDocumentRequests(portalClient.clientId);
  }

  @Post('documents/upload-url')
  @UseGuards(PortalTokenGuard)
  getUploadUrl(
    @CurrentPortalClient() portalClient: PortalClient,
    @Body() body: { fileName: string; mimeType: string; folder?: string },
  ) {
    return this.clientPortalService.getUploadUrl(portalClient.clientId, portalClient.firmId, body);
  }

  @Post('documents/confirm')
  @UseGuards(PortalTokenGuard)
  confirmUpload(
    @CurrentPortalClient() portalClient: PortalClient,
    @Body()
    body: {
      fileKey: string;
      fileName: string;
      mimeType: string;
      fileSize: number;
      caseId?: string;
      documentRequestId?: string;
    },
  ) {
    return this.clientPortalService.confirmUpload(portalClient.clientId, portalClient.firmId, body);
  }

  @Get('invoices')
  @UseGuards(PortalTokenGuard)
  getInvoices(@CurrentPortalClient() portalClient: PortalClient) {
    return this.clientPortalService.getInvoices(portalClient.clientId);
  }

  @Post('invoices/:id/checkout/stripe')
  @UseGuards(PortalTokenGuard)
  createStripeCheckout(
    @CurrentPortalClient() portalClient: PortalClient,
    @Param('id') id: string,
  ) {
    return this.clientPortalService.createStripeCheckout(portalClient.clientId, id);
  }

  @Post('invoices/:id/checkout/paypal')
  @UseGuards(PortalTokenGuard)
  createPaypalOrder(
    @CurrentPortalClient() portalClient: PortalClient,
    @Param('id') id: string,
  ) {
    return this.clientPortalService.createPaypalOrder(portalClient.clientId, id);
  }

  @Post('invoices/:id/paypal/capture')
  @UseGuards(PortalTokenGuard)
  capturePaypalOrder(
    @CurrentPortalClient() portalClient: PortalClient,
    @Param('id') id: string,
    @Body() body: { orderId: string },
  ) {
    return this.clientPortalService.capturePaypalOrder(portalClient.clientId, id, body.orderId);
  }

  @Get('messages')
  @UseGuards(PortalTokenGuard)
  getMessages(
    @CurrentPortalClient() portalClient: PortalClient,
    @Query('caseId') caseId?: string,
  ) {
    return this.clientPortalService.getMessages(portalClient.clientId, caseId);
  }

  @Post('messages')
  @UseGuards(PortalTokenGuard)
  sendMessage(
    @CurrentPortalClient() portalClient: PortalClient,
    @Body() body: { body: string; caseId?: string },
  ) {
    return this.clientPortalService.sendMessage(portalClient.clientId, portalClient.firmId, {
      body: body.body,
      caseId: body.caseId,
    });
  }

  @Get('meetings')
  @UseGuards(PortalTokenGuard)
  getMeetings(@CurrentPortalClient() portalClient: PortalClient) {
    return this.clientPortalService.getMeetings(portalClient.clientId);
  }

  @Post('meetings/request')
  @UseGuards(PortalTokenGuard)
  requestMeeting(
    @CurrentPortalClient() portalClient: PortalClient,
    @Body()
    body: {
      title: string;
      notes?: string;
      caseId?: string;
      proposedTimes?: string[];
      durationMinutes?: number;
    },
  ) {
    return this.clientPortalService.requestMeeting(
      portalClient.clientId,
      portalClient.firmId,
      body,
    );
  }

  // ─── Attorney-Side Portal Management (JwtAuthGuard) ────────────────────────

  @Get('clients/:clientId/token')
  @UseGuards(JwtAuthGuard)
  async getPortalToken(@CurrentUser() user: AuthUser, @Param('clientId') clientId: string) {
    return this.clientPortalService.getPortalToken(user.firmId, clientId);
  }

  @Post('clients/:clientId/enable')
  @UseGuards(JwtAuthGuard)
  enablePortal(@CurrentUser() user: AuthUser, @Param('clientId') clientId: string) {
    return this.clientPortalService.enablePortal(user.firmId, clientId);
  }

  @Post('clients/:clientId/disable')
  @UseGuards(JwtAuthGuard)
  disablePortal(@CurrentUser() user: AuthUser, @Param('clientId') clientId: string) {
    return this.clientPortalService.disablePortal(user.firmId, clientId);
  }

  @Post('document-requests')
  @UseGuards(JwtAuthGuard)
  createDocumentRequest(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      caseId: string;
      clientId: string;
      title: string;
      description?: string;
      dueDate?: string;
    },
  ) {
    return this.clientPortalService.createDocumentRequest(user.firmId, {
      ...body,
      createdById: user.id,
    });
  }

  @Get('clients/:clientId/activity')
  @UseGuards(JwtAuthGuard)
  getPortalActivity(@CurrentUser() user: AuthUser, @Param('clientId') clientId: string) {
    return this.clientPortalService.getPortalActivity(user.firmId, clientId);
  }

  @Get('clients/:clientId/document-requests')
  @UseGuards(JwtAuthGuard)
  getClientDocumentRequests(@CurrentUser() user: AuthUser, @Param('clientId') clientId: string) {
    return this.clientPortalService.getClientDocumentRequests(user.firmId, clientId);
  }

  @Get('firm/meetings')
  @UseGuards(JwtAuthGuard)
  getFirmMeetings(@CurrentUser() user: AuthUser) {
    return this.clientPortalService.getMeetings('', user.firmId);
  }

  @Post('meetings/:id/confirm')
  @UseGuards(JwtAuthGuard)
  confirmMeeting(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { confirmedTime: string; meetingLink?: string; attorneyId?: string },
  ) {
    return this.clientPortalService.confirmMeeting(user.firmId, id, body);
  }

  @Post('meetings/:id/decline')
  @UseGuards(JwtAuthGuard)
  declineMeeting(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { notes?: string },
  ) {
    return this.clientPortalService.declineMeeting(user.firmId, id, body);
  }
}
