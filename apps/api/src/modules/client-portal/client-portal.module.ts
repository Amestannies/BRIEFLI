import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClientPortalController } from './client-portal.controller';
import { ClientPortalService } from './client-portal.service';
import { PortalTokenGuard } from './portal-token.guard';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [ClientPortalController],
  providers: [ClientPortalService, PortalTokenGuard],
  exports: [ClientPortalService],
})
export class ClientPortalModule {}
