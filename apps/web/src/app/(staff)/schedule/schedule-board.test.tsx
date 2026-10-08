import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TimeOffStatus, UserRole } from '@repair-shop/shared';
import { ScheduleBoard } from './schedule-board';
import { shiftInstants } from './shift-dialog';
import type { Shift, TimeOffRequest } from '@/types/schedule';

jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn() }) }));
jest.mock('@/lib/api/client', () => ({ clientFetch: jest.fn(), ApiError: class extends Error {} }));

const weekStart = new Date('2030-01-07T00:00:00').toISOString(); // a Monday
const staff = [
  { id: 'tech', name: 'Tech', role: UserRole.TECHNICIAN },
  { id: 'desk', name: 'Desk', role: UserRole.STAFF },
];
const shift: Shift = {
  id: 's1',
  user: { id: 'tech', name: 'Tech' },
  startsAt: new Date('2030-01-08T09:00:00').toISOString(),
  endsAt: new Date('2030-01-08T17:30:00').toISOString(),
  notes: 'Bench',
  createdBy: { id: 'admin', name: 'Admin' },
};
const timeOff: TimeOffRequest = {
  id: 'to1',
  user: { id: 'desk', name: 'Desk' },
  startDate: '2030-01-09',
  endDate: '2030-01-10',
  days: 2,
  reason: null,
  status: TimeOffStatus.APPROVED,
  reviewedBy: null,
  reviewedAt: null,
  reviewNote: null,
  createdAt: '',
};

function renderBoard(canEdit: boolean) {
  return render(
    <ScheduleBoard
      weekStart={weekStart}
      staff={staff}
      shifts={[shift]}
      timeOff={[timeOff]}
      canEdit={canEdit}
      viewerId="tech"
    />,
  );
}

describe('ScheduleBoard', () => {
  it('lays out a row per employee with planned hours', () => {
    renderBoard(false);
    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(3);
    expect(within(rows[1]!).getByText('8h 30m planned')).toBeInTheDocument();
    expect(within(rows[1]!).getByText('Bench')).toBeInTheDocument();
    expect(within(rows[1]!).getByText('(you)')).toBeInTheDocument();
  });

  it('marks approved time off on the right days', () => {
    renderBoard(false);
    const deskRow = screen.getAllByRole('row')[2]!;
    expect(within(deskRow).getAllByText('Time off')).toHaveLength(2);
  });

  it('is read-only for staff', () => {
    renderBoard(false);
    expect(screen.queryByRole('button', { name: /add shift/i })).not.toBeInTheDocument();
  });

  it('lets admins open the add-shift dialog from a cell', async () => {
    const user = userEvent.setup();
    renderBoard(true);
    await user.click(screen.getAllByRole('button', { name: /add shift/i })[0]!);
    expect(await screen.findByRole('dialog', { name: /add shift/i })).toBeInTheDocument();
    expect(screen.getByLabelText('Date')).toHaveValue('2030-01-07');
  });
});

describe('shiftInstants', () => {
  it('rolls an end time before the start into the next day', () => {
    const { startsAt, endsAt } = shiftInstants('2030-01-07', '22:00', '06:00');
    expect((endsAt.getTime() - startsAt.getTime()) / 3_600_000).toBe(8);
  });
});
