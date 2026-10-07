import { IsOptional, IsUUID } from 'class-validator';

export class AssignTechnicianDto {
  @IsUUID() @IsOptional() assignedToId?: string;
}
