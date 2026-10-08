import { TimeOffStatus } from '@repair-shop/shared';

export interface Shift {
  id: string;
  user: { id: string; name: string };
  startsAt: string;
  endsAt: string;
  notes: string | null;
  createdBy: { id: string; name: string };
}

export interface TimeOffRequest {
  id: string;
  user: { id: string; name: string };
  /** YYYY-MM-DD, inclusive */
  startDate: string;
  endDate: string;
  days: number;
  reason: string | null;
  status: TimeOffStatus;
  reviewedBy: { id: string; name: string } | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  createdAt: string;
  conflictingShifts?: number;
}
