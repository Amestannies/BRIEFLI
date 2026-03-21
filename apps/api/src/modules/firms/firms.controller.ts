import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator';
import { FirmsService } from './firms.service';

@Controller('firms')
@UseGuards(JwtAuthGuard)
export class FirmsController {
  constructor(private readonly firmsService: FirmsService) {}

  @Get('me')
  get(@CurrentUser() user: AuthUser) {
    return this.firmsService.findOne(user.firmId);
  }

  @Patch('me')
  update(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    return this.firmsService.update(user.firmId, body);
  }
}
