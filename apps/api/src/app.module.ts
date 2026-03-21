import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { FirmsModule } from './modules/firms/firms.module';
import { CasesModule } from './modules/cases/cases.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { BillingModule } from './modules/billing/billing.module';
import { ClientPortalModule } from './modules/client-portal/client-portal.module';
import { EcourtsModule } from './modules/ecourts/ecourts.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ReportsModule } from './modules/reports/reports.module';
import { ClientsModule } from './modules/clients/clients.module';
import { ChatModule } from './modules/chat/chat.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env.local', '../../.env', '.env'],
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    AuthModule,
    UsersModule,
    FirmsModule,
    CasesModule,
    ClientsModule,
    DocumentsModule,
    CalendarModule,
    BillingModule,
    ClientPortalModule,
    EcourtsModule,
    NotificationsModule,
    ReportsModule,
    ChatModule,
  ],
})
export class AppModule {}
