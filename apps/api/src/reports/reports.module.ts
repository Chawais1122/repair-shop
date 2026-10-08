import { Module } from '@nestjs/common';
import { InvoicesModule } from '../invoices/invoices.module';
import { PaymentsModule } from '../payments/payments.module';
import { TicketsModule } from '../tickets/tickets.module';
import { TimeClockModule } from '../time-clock/time-clock.module';
import { UsersModule } from '../users/users.module';
import { MetricsService } from './metrics.service';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [InvoicesModule, PaymentsModule, TicketsModule, TimeClockModule, UsersModule],
  controllers: [ReportsController],
  providers: [ReportsService, MetricsService],
})
export class ReportsModule {}
