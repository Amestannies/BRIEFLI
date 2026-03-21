import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, HttpCode, HttpStatus,
  Res, Redirect,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator';
import { CalendarService } from './calendar.service';

@Controller('calendar')
@UseGuards(JwtAuthGuard)
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get('events')
  findAll(@CurrentUser() user: AuthUser, @Query() query: Record<string, string>) {
    return this.calendarService.findAll(user.firmId, query);
  }

  @Post('events')
  create(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    return this.calendarService.create(user.firmId, user.id, body);
  }

  @Patch('events/:id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.calendarService.update(user.firmId, id, body);
  }

  @Delete('events/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.calendarService.remove(user.firmId, id);
  }

  @Get('upcoming')
  getUpcoming(@CurrentUser() user: AuthUser) {
    return this.calendarService.getUpcoming(user.firmId);
  }

  @Get('integrations/status')
  integrationStatus(@CurrentUser() user: AuthUser) {
    return this.calendarService.getIntegrationStatus(user.id);
  }

  // ─── Google ───────────────────────────────────────────────────────────────

  @Post('google/connect')
  googleConnect(@CurrentUser() user: AuthUser) {
    return this.calendarService.getGoogleAuthUrl(user.id);
  }

  /** OAuth2 callback — no JwtAuthGuard, userId comes from state param */
  @Get('google/callback')
  async googleCallback(@Query('code') code: string, @Query('state') userId: string, @Res() res: Response) {
    const redirectUrl = await this.calendarService.handleGoogleCallback(code, userId);
    res.redirect(redirectUrl);
  }

  @Post('google/sync')
  syncGoogle(@CurrentUser() user: AuthUser) {
    return this.calendarService.syncFromGoogle(user.id, user.firmId);
  }

  @Post('events/:id/push-google')
  pushToGoogle(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.calendarService.pushToGoogle(user.firmId, user.id, id);
  }

  @Post('google/disconnect')
  googleDisconnect(@CurrentUser() user: AuthUser) {
    return this.calendarService.disconnectGoogle(user.id);
  }

  // ─── Outlook ──────────────────────────────────────────────────────────────

  @Post('outlook/connect')
  outlookConnect(@CurrentUser() user: AuthUser) {
    return this.calendarService.getOutlookAuthUrl(user.id);
  }

  @Get('outlook/callback')
  async outlookCallback(@Query('code') code: string, @Query('state') userId: string, @Res() res: Response) {
    const redirectUrl = await this.calendarService.handleOutlookCallback(code, userId);
    res.redirect(redirectUrl);
  }

  @Post('outlook/sync')
  syncOutlook(@CurrentUser() user: AuthUser) {
    return this.calendarService.syncFromOutlook(user.id, user.firmId);
  }

  @Post('events/:id/push-outlook')
  pushToOutlook(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.calendarService.pushToOutlook(user.firmId, user.id, id);
  }

  @Post('outlook/disconnect')
  outlookDisconnect(@CurrentUser() user: AuthUser) {
    return this.calendarService.disconnectOutlook(user.id);
  }
}
