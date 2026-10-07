import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { UserRole } from '@repair-shop/shared';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentResponseDto, PaymentSummaryDto } from './dto/payment-response.dto';
import { PaymentsService } from './payments.service';

@Controller('tickets/:ticketId/payments')
export class TicketPaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  getSummary(@Param('ticketId') ticketId: string): Promise<PaymentSummaryDto> {
    return this.paymentsService.getSummary(ticketId);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @HttpCode(HttpStatus.CREATED)
  create(
    @Param('ticketId') ticketId: string,
    @Body() dto: CreatePaymentDto,
  ): Promise<PaymentResponseDto> {
    return this.paymentsService.create(ticketId, dto);
  }
}
