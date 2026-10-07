import { UserRole } from '@repair-shop/shared';

export class LoginResponseDto {
  id!: string;
  email!: string;
  name!: string;
  role!: UserRole;
}
