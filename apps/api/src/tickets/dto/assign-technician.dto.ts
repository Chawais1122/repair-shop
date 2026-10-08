import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AssignTechnicianDto {
  @IsString() @IsNotEmpty() @IsOptional() assignedToId?: string;
}
