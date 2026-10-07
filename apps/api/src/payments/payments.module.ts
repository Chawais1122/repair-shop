import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { TicketPaymentsController } from './ticket-payments.controller';

@Module({
  controllers: [TicketPaymentsController, PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
