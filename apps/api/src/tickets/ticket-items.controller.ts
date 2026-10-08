import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { UserRole } from '@repair-shop/shared';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { CreateTicketItemDto } from './dto/create-ticket-item.dto';
import { TicketItemResponseDto, TicketItemsSummaryDto } from './dto/ticket-item-response.dto';
import { TicketItemsService } from './ticket-items.service';

@Controller('tickets/:ticketId/items')
export class TicketItemsController {
  constructor(private readonly ticketItemsService: TicketItemsService) {}

  @Get()
  list(@Param('ticketId') ticketId: string): Promise<TicketItemsSummaryDto> {
    return this.ticketItemsService.list(ticketId);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.TECHNICIAN)
  @HttpCode(HttpStatus.CREATED)
  add(
    @Param('ticketId') ticketId: string,
    @Body() dto: CreateTicketItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<TicketItemResponseDto> {
    return this.ticketItemsService.add(ticketId, dto, user.id);
  }

  @Delete(':itemId')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.TECHNICIAN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('ticketId') ticketId: string,
    @Param('itemId') itemId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.ticketItemsService.remove(ticketId, itemId, user.id);
  }
}
