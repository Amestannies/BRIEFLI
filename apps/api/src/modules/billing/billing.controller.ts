import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus, RawBodyRequest, Req, Headers,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator';
import { BillingService } from './billing.service';

@Controller()
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  // ─── Time Entries ─────────────────────────────────────────────────────────

  @Get('time-entries')
  @UseGuards(JwtAuthGuard)
  getTimeEntries(@CurrentUser() user: AuthUser, @Query() query: Record<string, string>) {
    return this.billingService.getTimeEntries(user.firmId, query);
  }

  @Post('time-entries')
  @UseGuards(JwtAuthGuard)
  createTimeEntry(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    return this.billingService.createTimeEntry(user.firmId, user.id, body);
  }

  @Patch('time-entries/:id')
  @UseGuards(JwtAuthGuard)
  updateTimeEntry(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.billingService.updateTimeEntry(user.firmId, id, body);
  }

  @Delete('time-entries/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteTimeEntry(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.billingService.deleteTimeEntry(user.firmId, id);
  }

  // ─── Invoices ─────────────────────────────────────────────────────────────

  @Get('invoices')
  @UseGuards(JwtAuthGuard)
  getInvoices(@CurrentUser() user: AuthUser, @Query() query: Record<string, string>) {
    return this.billingService.getInvoices(user.firmId, query);
  }

  @Post('invoices')
  @UseGuards(JwtAuthGuard)
  createInvoice(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    return this.billingService.createInvoice(user.firmId, body);
  }

  @Get('invoices/:id')
  @UseGuards(JwtAuthGuard)
  getInvoice(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.billingService.getInvoice(user.firmId, id);
  }

  @Patch('invoices/:id')
  @UseGuards(JwtAuthGuard)
  updateInvoice(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.billingService.updateInvoice(user.firmId, id, body);
  }

  @Post('invoices/:id/send')
  @UseGuards(JwtAuthGuard)
  sendInvoice(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.billingService.sendInvoice(user.firmId, id);
  }

  @Post('invoices/:id/void')
  @UseGuards(JwtAuthGuard)
  voidInvoice(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.billingService.voidInvoice(user.firmId, id);
  }

  // ─── Stripe ───────────────────────────────────────────────────────────────

  @Post('invoices/:id/stripe/checkout')
  @UseGuards(JwtAuthGuard)
  createStripeCheckout(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.billingService.createStripeCheckout(user.firmId, id);
  }

  @Post('invoices/:id/paypal/order')
  @UseGuards(JwtAuthGuard)
  createPaypalOrder(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.billingService.createPaypalOrder(user.firmId, id);
  }

  @Post('invoices/:id/paypal/capture')
  @UseGuards(JwtAuthGuard)
  capturePaypalOrder(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { orderId: string }) {
    return this.billingService.capturePaypalOrder(user.firmId, id, body.orderId);
  }

  /** Raw body required for Stripe signature verification — no auth guard */
  @Post('stripe/webhook')
  @HttpCode(HttpStatus.OK)
  async stripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') sig: string,
  ) {
    await this.billingService.handleStripeWebhook(req.rawBody!, sig);
    return { received: true };
  }

  // ─── Billing Settings ─────────────────────────────────────────────────────

  @Get('billing/settings')
  @UseGuards(JwtAuthGuard)
  getBillingSettings(@CurrentUser() user: AuthUser) {
    return this.billingService.getBillingSettings(user.firmId);
  }

  @Patch('billing/settings')
  @UseGuards(JwtAuthGuard)
  updateBillingSettings(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    return this.billingService.updateBillingSettings(user.firmId, body);
  }

  // ─── Reports ──────────────────────────────────────────────────────────────

  @Get('billing/summary')
  @UseGuards(JwtAuthGuard)
  billingSummary(@CurrentUser() user: AuthUser) {
    return this.billingService.billingSummary(user.firmId);
  }

  @Get('billing/reports/revenue')
  @UseGuards(JwtAuthGuard)
  revenueReport(@CurrentUser() user: AuthUser, @Query() query: Record<string, string>) {
    return this.billingService.revenueReport(user.firmId, query);
  }

  @Get('billing/reports/ar-aging')
  @UseGuards(JwtAuthGuard)
  arAging(@CurrentUser() user: AuthUser) {
    return this.billingService.arAging(user.firmId);
  }
}
