import {
  Controller, Get, Post, Patch, Delete, Body, Param,
  Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator';
import { ClientsService } from './clients.service';

@Controller('clients')
@UseGuards(JwtAuthGuard)
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query() filters: Record<string, string>) {
    return this.clientsService.findAll(user.firmId, filters);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    return this.clientsService.create(user.firmId, body);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.clientsService.findOne(user.firmId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.clientsService.update(user.firmId, id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.clientsService.remove(user.firmId, id);
  }

  @Post(':id/portal/enable')
  enablePortal(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.clientsService.enablePortal(user.firmId, id);
  }

  @Post(':id/portal/disable')
  disablePortal(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.clientsService.disablePortal(user.firmId, id);
  }

  @Post(':id/cases/:caseId')
  linkToCase(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('caseId') caseId: string,
  ) {
    return this.clientsService.linkToCase(user.firmId, id, caseId);
  }

  @Delete(':id/cases/:caseId')
  @HttpCode(HttpStatus.NO_CONTENT)
  unlinkFromCase(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('caseId') caseId: string,
  ) {
    return this.clientsService.unlinkFromCase(user.firmId, id, caseId);
  }
}
