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
import { PaginatedResponse, UserRole } from '@repair-shop/shared';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { CreateUserDto } from './dto/create-user.dto';
import { FindUsersQueryDto } from './dto/find-users-query.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('technicians')
  getTechnicians(): Promise<Array<{ id: string; name: string; email: string; role: UserRole }>> {
    return this.usersService.findTechnicians();
  }

  // Staff directory — readable by everyone (scheduling, chat, assignment pickers)
  @Get()
  findAll(
    @Query() query: FindUsersQueryDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ): Promise<PaginatedResponse<UserResponseDto>> {
    return this.usersService.findAll(query, viewer.role);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    return this.usersService.findOne(id, viewer.role);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    return this.usersService.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    return this.usersService.update(id, dto, actor.id);
  }

  @Post(':id/password')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  resetPassword(@Param('id') id: string, @Body() dto: ResetPasswordDto): Promise<void> {
    return this.usersService.resetPassword(id, dto);
  }
}
