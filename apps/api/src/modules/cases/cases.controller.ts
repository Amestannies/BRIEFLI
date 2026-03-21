import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator';
import { CasesService } from './cases.service';

@Controller('cases')
@UseGuards(JwtAuthGuard)
export class CasesController {
  constructor(private readonly casesService: CasesService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query() filters: Record<string, string>) {
    return this.casesService.findAll(user.firmId, filters);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    return this.casesService.create(user.firmId, user.id, body);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.casesService.findOne(user.firmId, id);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.casesService.update(user.firmId, id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.casesService.remove(user.firmId, id);
  }

  @Get(':id/timeline')
  getTimeline(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.casesService.getTimeline(user.firmId, id);
  }

  @Get(':id/milestones')
  getMilestones(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.casesService.getMilestones(user.firmId, id);
  }

  @Post(':id/milestones')
  createMilestone(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.casesService.createMilestone(user.firmId, id, body);
  }

  @Post(':id/milestones/:mid/complete')
  completeMilestone(@CurrentUser() user: AuthUser, @Param('id') id: string, @Param('mid') mid: string) {
    return this.casesService.completeMilestone(user.firmId, id, mid, user.id);
  }

  @Post(':id/notes')
  createNote(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { body: string }) {
    return this.casesService.createNote(user.firmId, id, user.id, body.body);
  }

  @Get(':id/notes')
  getNotes(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.casesService.getNotes(user.firmId, id);
  }
}
