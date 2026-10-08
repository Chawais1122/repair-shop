import { UserRole } from '@repair-shop/shared';

export interface StaffUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  phone: string | null;
  /** Only populated for admins. */
  hourlyRate: string | null;
  monthlySalesTarget: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TimeEntry {
  id: string;
  user: { id: string; name: string };
  clockIn: string;
  clockOut: string | null;
  durationMinutes: number;
  notes: string | null;
  editedBy: { id: string; name: string } | null;
  createdAt: string;
}

export interface ClockStatus {
  clockedIn: boolean;
  openEntry: TimeEntry | null;
  todayMinutes: number;
  weekMinutes: number;
}

export interface TimesheetRow {
  user: { id: string; name: string };
  totalMinutes: number;
  entryCount: number;
  openEntries: number;
}
