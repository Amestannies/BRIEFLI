import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('cases')
  caseReport(@CurrentUser() user: AuthUser, @Query() query: Record<string, string>) {
    return this.reportsService.caseReport(user.firmId, query);
  }

  @Get('activity')
  activityReport(@CurrentUser() user: AuthUser, @Query() query: Record<string, string>) {
    return this.reportsService.activityReport(user.firmId, query);
  }
}
