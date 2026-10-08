import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { PaginatedResponse, UserRole } from '@repair-shop/shared';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import {
  ClockStatusDto,
  TimeEntryResponseDto,
  TimesheetRowDto,
} from './dto/time-entry-response.dto';
import {
  ClockActionDto,
  CreateTimeEntryDto,
  FindTimeEntriesQueryDto,
  TimesheetQueryDto,
  UpdateTimeEntryDto,
} from './dto/time-entry.dto';
import { TimeClockService } from './time-clock.service';

@Controller()
export class TimeClockController {
  constructor(private readonly timeClockService: TimeClockService) {}

  @Get('time-clock/me')
  status(@CurrentUser() user: AuthenticatedUser): Promise<ClockStatusDto> {
    return this.timeClockService.getStatus(user.id);
  }

  @Post('time-clock/clock-in')
  @HttpCode(HttpStatus.OK)
  clockIn(
    @Body() dto: ClockActionDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ClockStatusDto> {
    return this.timeClockService.clockIn(user.id, dto.notes);
  }

  @Post('time-clock/clock-out')
  @HttpCode(HttpStatus.OK)
  clockOut(
    @Body() dto: ClockActionDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ClockStatusDto> {
    return this.timeClockService.clockOut(user.id, dto.notes);
  }

  @Get('time-entries')
  findEntries(
    @Query() query: FindTimeEntriesQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PaginatedResponse<TimeEntryResponseDto>> {
    return this.timeClockService.findEntries(query, user);
  }

  @Get('time-entries/timesheet')
  timesheet(
    @Query() query: TimesheetQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<TimesheetRowDto[]> {
    return this.timeClockService.getTimesheet(query, user);
  }

  @Post('time-entries')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateTimeEntryDto,
    @CurrentUser() admin: AuthenticatedUser,
  ): Promise<TimeEntryResponseDto> {
    return this.timeClockService.createEntry(dto, admin.id);
  }

  @Patch('time-entries/:id')
  @Roles(UserRole.ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTimeEntryDto,
    @CurrentUser() admin: AuthenticatedUser,
  ): Promise<TimeEntryResponseDto> {
    return this.timeClockService.updateEntry(id, dto, admin.id);
  }

  @Delete('time-entries/:id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string): Promise<void> {
    return this.timeClockService.deleteEntry(id);
  }
}
