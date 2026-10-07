import { DeviceType } from '@repair-shop/shared';

export class DeviceResponseDto {
  id!: string;
  customerId!: string;
  type!: DeviceType;
  brand!: string;
  model!: string;
  serialNumber!: string | null;
  imei!: string | null;
  hasPasscode!: boolean;
  notes!: string | null;
  createdAt!: Date;
  updatedAt!: Date;
}
