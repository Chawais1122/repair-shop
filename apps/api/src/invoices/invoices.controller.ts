import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { PaginatedResponse, UserRole } from '@repair-shop/shared';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { FindInvoicesQueryDto } from './dto/find-invoices-query.dto';
import { InvoiceResponseDto, InvoiceSummaryDto } from './dto/invoice-response.dto';
import { RecordInvoicePaymentDto } from './dto/record-invoice-payment.dto';
import { VoidInvoiceDto } from './dto/void-invoice.dto';
import { InvoicesService } from './invoices.service';

@Controller()
@Roles(UserRole.ADMIN, UserRole.STAFF)
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get('invoices')
  findAll(@Query() query: FindInvoicesQueryDto): Promise<PaginatedResponse<InvoiceSummaryDto>> {
    return this.invoicesService.findAll(query);
  }

  @Get('invoices/:id')
  findOne(@Param('id') id: string): Promise<InvoiceResponseDto> {
    return this.invoicesService.findOne(id);
  }

  @Get('tickets/:ticketId/invoice')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.TECHNICIAN)
  findForTicket(@Param('ticketId') ticketId: string): Promise<InvoiceResponseDto> {
    return this.invoicesService.findActiveForTicket(ticketId);
  }

  @Post('invoices')
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateInvoiceDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<InvoiceResponseDto> {
    return this.invoicesService.create(dto, user.id);
  }

  @Post('invoices/:id/payments')
  @HttpCode(HttpStatus.CREATED)
  recordPayment(
    @Param('id') id: string,
    @Body() dto: RecordInvoicePaymentDto,
  ): Promise<InvoiceResponseDto> {
    return this.invoicesService.recordPayment(id, dto);
  }

  @Post('invoices/:id/payments/:paymentId/refund')
  @Roles(UserRole.ADMIN)
  refundPayment(
    @Param('id') id: string,
    @Param('paymentId') paymentId: string,
  ): Promise<InvoiceResponseDto> {
    return this.invoicesService.refundPayment(id, paymentId);
  }

  @Post('invoices/:id/void')
  @Roles(UserRole.ADMIN)
  void(
    @Param('id') id: string,
    @Body() dto: VoidInvoiceDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<InvoiceResponseDto> {
    return this.invoicesService.void(id, dto, user.id);
  }
}
