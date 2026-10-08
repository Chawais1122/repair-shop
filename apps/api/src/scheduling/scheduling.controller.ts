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
import { UserRole } from '@repair-shop/shared';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import {
  CopyWeekDto,
  CreateShiftDto,
  FindShiftsQueryDto,
  ShiftResponseDto,
  UpdateShiftDto,
} from './dto/shift.dto';
import {
  FindTimeOffQueryDto,
  RequestTimeOffDto,
  ReviewTimeOffDto,
  TimeOffResponseDto,
} from './dto/time-off.dto';
import { SchedulingService } from './scheduling.service';

@Controller()
export class SchedulingController {
  constructor(private readonly schedulingService: SchedulingService) {}

  @Get('shifts')
  findShifts(@Query() query: FindShiftsQueryDto): Promise<ShiftResponseDto[]> {
    return this.schedulingService.findShifts(query);
  }

  @Post('shifts')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  createShift(
    @Body() dto: CreateShiftDto,
    @CurrentUser() admin: AuthenticatedUser,
  ): Promise<ShiftResponseDto> {
    return this.schedulingService.createShift(dto, admin.id);
  }

  @Post('shifts/copy-week')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  copyWeek(
    @Body() dto: CopyWeekDto,
    @CurrentUser() admin: AuthenticatedUser,
  ): Promise<{ created: number; skipped: number }> {
    return this.schedulingService.copyWeek(dto, admin.id);
  }

  @Patch('shifts/:id')
  @Roles(UserRole.ADMIN)
  updateShift(@Param('id') id: string, @Body() dto: UpdateShiftDto): Promise<ShiftResponseDto> {
    return this.schedulingService.updateShift(id, dto);
  }

  @Delete('shifts/:id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteShift(@Param('id') id: string): Promise<void> {
    return this.schedulingService.deleteShift(id);
  }

  @Get('time-off')
  findTimeOff(
    @Query() query: FindTimeOffQueryDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ): Promise<TimeOffResponseDto[]> {
    return this.schedulingService.findTimeOff(query, viewer);
  }

  @Post('time-off')
  @HttpCode(HttpStatus.CREATED)
  requestTimeOff(
    @Body() dto: RequestTimeOffDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<TimeOffResponseDto> {
    return this.schedulingService.requestTimeOff(dto, user.id);
  }

  @Patch('time-off/:id/review')
  @Roles(UserRole.ADMIN)
  reviewTimeOff(
    @Param('id') id: string,
    @Body() dto: ReviewTimeOffDto,
    @CurrentUser() admin: AuthenticatedUser,
  ): Promise<TimeOffResponseDto> {
    return this.schedulingService.reviewTimeOff(id, dto, admin.id);
  }

  @Post('time-off/:id/cancel')
  @HttpCode(HttpStatus.OK)
  cancelTimeOff(
    @Param('id') id: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ): Promise<TimeOffResponseDto> {
    return this.schedulingService.cancelTimeOff(id, viewer);
  }
}
