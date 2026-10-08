export class TimeEntryResponseDto {
  id!: string;
  user!: { id: string; name: string };
  clockIn!: Date;
  clockOut!: Date | null;
  /** Minutes worked; for an open entry, minutes so far. */
  durationMinutes!: number;
  notes!: string | null;
  editedBy!: { id: string; name: string } | null;
  createdAt!: Date;
}

export class ClockStatusDto {
  clockedIn!: boolean;
  openEntry!: TimeEntryResponseDto | null;
  todayMinutes!: number;
  weekMinutes!: number;
}

export class TimesheetRowDto {
  user!: { id: string; name: string };
  totalMinutes!: number;
  entryCount!: number;
  openEntries!: number;
}
