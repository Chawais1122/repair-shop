import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { DeviceType } from '@repair-shop/shared';

export class CreateDeviceDto {
  @IsEnum(DeviceType)
  type!: DeviceType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  brand!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  model!: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  serialNumber?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  imei?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  passcode?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
