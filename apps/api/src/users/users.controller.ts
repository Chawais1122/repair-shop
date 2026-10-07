import { Controller, Get } from '@nestjs/common';
import { UsersService } from './users.service';
import { UserRole } from '@repair-shop/shared';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('technicians')
  getTechnicians(): Promise<Array<{ id: string; name: string; email: string; role: UserRole }>> {
    return this.usersService.findTechnicians();
  }
}
