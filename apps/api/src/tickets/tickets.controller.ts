import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { UserRole } from '@repair-shop/shared';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { PaginatedResponse } from '@repair-shop/shared';
import { AssignTechnicianDto } from './dto/assign-technician.dto';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { FindTicketsQueryDto } from './dto/find-tickets-query.dto';
import { TicketResponseDto } from './dto/ticket-response.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { TicketsService } from './tickets.service';

@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  findAll(@Query() query: FindTicketsQueryDto): Promise<PaginatedResponse<TicketResponseDto>> {
    return this.ticketsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<TicketResponseDto> {
    return this.ticketsService.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateTicketDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<TicketResponseDto> {
    return this.ticketsService.create(dto, user.id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTicketDto,
  ): Promise<TicketResponseDto> {
    return this.ticketsService.update(id, dto);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.TECHNICIAN)
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTicketStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<TicketResponseDto> {
    return this.ticketsService.updateStatus(id, dto, user.id);
  }

  @Patch(':id/assign')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  assignTechnician(
    @Param('id') id: string,
    @Body() dto: AssignTechnicianDto,
  ): Promise<TicketResponseDto> {
    return this.ticketsService.assignTechnician(id, dto);
  }
}
