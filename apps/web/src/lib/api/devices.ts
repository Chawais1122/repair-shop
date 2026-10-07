import { cookies } from 'next/headers';
import { apiFetch } from './client';
import type { Device } from '@/types/device';
import type { PaginatedResponse } from '@repair-shop/shared';

export interface DeviceQueryParams {
  search?: string;
  page?: number;
  limit?: number;
}

async function getCookieHeader(): Promise<string> {
  const cookieStore = await cookies();
  return cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');
}

export async function getCustomerDevices(
  customerId: string,
  params?: DeviceQueryParams,
): Promise<PaginatedResponse<Device>> {
  const cookieHeader = await getCookieHeader();
  const qs = params
    ? new URLSearchParams(
        Object.fromEntries(
          Object.entries(params)
            .filter(([, v]) => v !== undefined && v !== '')
            .map(([k, v]) => [k, String(v)]),
        ),
      ).toString()
    : '';

  return apiFetch<PaginatedResponse<Device>>(
    `/customers/${customerId}/devices${qs ? `?${qs}` : ''}`,
    cookieHeader,
  );
}

export async function getDevice(deviceId: string): Promise<Device> {
  const cookieHeader = await getCookieHeader();
  const result = await apiFetch<{ data: Device }>(`/devices/${deviceId}`, cookieHeader);
  return result.data;
}
