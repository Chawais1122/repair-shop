import Link from 'next/link';
import { ChevronLeft, ChevronRight, Plane } from 'lucide-react';
import { TimeOffStatus, UserRole } from '@repair-shop/shared';
import { getCurrentUser } from '@/lib/api/customers';
import { getShifts, getTimeOff } from '@/lib/api/schedule';
import { getUsers } from '@/lib/api/team';
import { startOfWeek, toDateParam } from '@/lib/format';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { ScheduleBoard } from './schedule-board';
import { CopyWeekButton } from './copy-week-button';

interface Props {
  searchParams: Promise<{ week?: string }>;
}

export default async function SchedulePage({ searchParams }: Props) {
  const { week } = await searchParams;
  const parsed = week ? new Date(`${week}T00:00:00`) : new Date();
  const from = startOfWeek(Number.isNaN(parsed.getTime()) ? new Date() : parsed);
  const to = new Date(from);
  to.setDate(to.getDate() + 7);
  const prev = new Date(from);
  prev.setDate(prev.getDate() - 7);
  const lastDay = new Date(to);
  lastDay.setDate(lastDay.getDate() - 1);

  const viewer = await getCurrentUser();
  const isAdmin = viewer?.role === UserRole.ADMIN;

  const [staff, shifts, timeOff] = await Promise.all([
    getUsers({ limit: 100 }),
    getShifts({ from: from.toISOString(), to: to.toISOString() }),
    getTimeOff({
      status: TimeOffStatus.APPROVED,
      from: from.toISOString(),
      to: lastDay.toISOString(),
    }),
  ]);

  const isCurrentWeek = toDateParam(from) === toDateParam(startOfWeek(new Date()));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Schedule"
        description={
          isAdmin
            ? 'Click a cell to add a shift, or drag a shift to move it.'
            : 'Your team’s shifts for the week.'
        }
        className="mb-0"
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/schedule/time-off">
                <Plane />
                Time off
              </Link>
            </Button>
            {isAdmin && (
              <CopyWeekButton
                sourceWeekStart={prev.toISOString()}
                targetWeekStart={from.toISOString()}
              />
            )}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="outline" size="icon" aria-label="Previous week">
          <Link href={`/schedule?week=${toDateParam(prev)}`}>
            <ChevronLeft />
          </Link>
        </Button>
        <p className="min-w-56 text-center text-sm font-medium">
          {from.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} –{' '}
          {lastDay.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </p>
        <Button asChild variant="outline" size="icon" aria-label="Next week">
          <Link href={`/schedule?week=${toDateParam(to)}`}>
            <ChevronRight />
          </Link>
        </Button>
        {!isCurrentWeek && (
          <Button asChild variant="ghost" size="sm">
            <Link href="/schedule">This week</Link>
          </Button>
        )}
      </div>

      <ScheduleBoard
        weekStart={from.toISOString()}
        staff={staff.data.map((u) => ({ id: u.id, name: u.name, role: u.role }))}
        shifts={shifts}
        timeOff={timeOff}
        canEdit={isAdmin}
        viewerId={viewer?.id ?? ''}
      />
    </div>
  );
}
