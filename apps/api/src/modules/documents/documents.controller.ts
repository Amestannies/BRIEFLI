import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator';
import { DocumentsService } from './documents.service';

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload-url')
  getUploadUrl(@CurrentUser() user: AuthUser, @Body() body: { fileName: string; mimeType: string }) {
    return this.documentsService.getPresignedUploadUrl(user.firmId, body.fileName, body.mimeType);
  }

  @Post('confirm')
  confirmUpload(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    return this.documentsService.confirmUpload(user.firmId, user.id, body);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query() query: Record<string, string>) {
    return this.documentsService.findAll(user.firmId, query);
  }

  @Get('stats')
  getStats(@CurrentUser() user: AuthUser) {
    return this.documentsService.getStats(user.firmId);
  }

  @Get('search')
  search(@CurrentUser() user: AuthUser, @Query('q') q: string, @Query('caseId') caseId?: string) {
    return this.documentsService.search(user.firmId, q, caseId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.documentsService.findOne(user.firmId, id);
  }

  @Get(':id/download-url')
  getDownloadUrl(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.documentsService.getPresignedDownloadUrl(user.firmId, id);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.documentsService.update(user.firmId, id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.documentsService.remove(user.firmId, id);
  }
}
