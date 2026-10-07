import type { DeviceType } from '@repair-shop/shared';

export interface Device {
  id: string;
  customerId: string;
  type: DeviceType;
  brand: string;
  model: string;
  serialNumber: string | null;
  imei: string | null;
  hasPasscode: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}
