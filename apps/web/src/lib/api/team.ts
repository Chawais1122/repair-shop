import type { PaginatedResponse, UserRole } from '@repair-shop/shared';
import type { StaffUser, TimeEntry, TimesheetRow } from '@/types/team';
import { serverGet, serverGetPage } from './server';

export function getUsers(params?: {
  search?: string;
  role?: UserRole;
  includeInactive?: boolean;
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<StaffUser>> {
  return serverGetPage<StaffUser>('/users', params);
}

export function getUser(id: string): Promise<StaffUser> {
  return serverGet<StaffUser>(`/users/${id}`);
}

export function getTimeEntries(params: {
  userId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<TimeEntry>> {
  return serverGetPage<TimeEntry>('/time-entries', params);
}

export function getTimesheet(params: {
  from: string;
  to: string;
  userId?: string;
}): Promise<TimesheetRow[]> {
  return serverGet<TimesheetRow[]>('/time-entries/timesheet', params);
}
