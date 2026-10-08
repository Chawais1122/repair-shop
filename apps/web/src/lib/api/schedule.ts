import type { TimeOffStatus } from '@repair-shop/shared';
import type { Shift, TimeOffRequest } from '@/types/schedule';
import { serverGet } from './server';

export function getShifts(params: { from: string; to: string; userId?: string }): Promise<Shift[]> {
  return serverGet<Shift[]>('/shifts', params);
}

export function getTimeOff(params?: {
  status?: TimeOffStatus;
  userId?: string;
  from?: string;
  to?: string;
}): Promise<TimeOffRequest[]> {
  return serverGet<TimeOffRequest[]>('/time-off', params);
}
