import { UserRole } from '@repair-shop/shared';

// passwordHash is never part of a response.
export class UserResponseDto {
  id!: string;
  email!: string;
  name!: string;
  role!: UserRole;
  isActive!: boolean;
  phone!: string | null;
  hourlyRate!: string | null;
  monthlySalesTarget!: string | null;
  createdAt!: Date;
  updatedAt!: Date;
}
