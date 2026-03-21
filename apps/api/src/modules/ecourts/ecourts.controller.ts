import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator';
import { EcourtsService } from './ecourts.service';

@Controller('ecourts')
@UseGuards(JwtAuthGuard)
export class EcourtsController {
  constructor(private readonly ecourtsService: EcourtsService) {}

  @Post('credentials')
  storeCredentials(@CurrentUser() user: AuthUser, @Body() body: { username: string; password: string }) {
    return this.ecourtsService.storeCredentials(user.id, body);
  }

  @Delete('credentials')
  removeCredentials(@CurrentUser() user: AuthUser) {
    return this.ecourtsService.removeCredentials(user.id);
  }

  @Get('credentials/status')
  credentialStatus(@CurrentUser() user: AuthUser) {
    return this.ecourtsService.getCredentialStatus(user.id);
  }

  @Get('notifications')
  getNotifications(@CurrentUser() user: AuthUser) {
    return this.ecourtsService.getNotifications(user.firmId, user.id);
  }

  @Post('notifications/sync')
  syncNotifications(@CurrentUser() user: AuthUser) {
    return this.ecourtsService.fetchAndSyncNotifications(user.id, user.firmId);
  }

  @Post('notifications/:id/import')
  importNotification(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.ecourtsService.importNotificationToCalendar(user.firmId, user.id, id);
  }

  @Post('search')
  search(@CurrentUser() user: AuthUser, @Body() body: Record<string, string>) {
    return this.ecourtsService.search(user.id, body);
  }

  @Post('import')
  importCase(@CurrentUser() user: AuthUser, @Body() body: Record<string, string>) {
    return this.ecourtsService.importCase(user.firmId, user.id, body);
  }

  @Post('sync/:caseId')
  syncCase(@CurrentUser() user: AuthUser, @Param('caseId') caseId: string) {
    return this.ecourtsService.syncCase(user.firmId, user.id, caseId);
  }
}
