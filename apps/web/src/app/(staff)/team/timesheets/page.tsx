import Link from 'next/link';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { UserRole } from '@repair-shop/shared';
import { getCurrentUser } from '@/lib/api/customers';
import { getTimeEntries, getTimesheet, getUsers } from '@/lib/api/team';
import { formatCurrency, formatMinutes, startOfWeek, toDateParam } from '@/lib/format';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TimeEntryDialog } from './time-entry-dialog';
import { DeleteTimeEntryButton } from './delete-time-entry-button';

interface Props {
  searchParams: Promise<{ week?: string }>;
}

function parseWeek(param: string | undefined): Date {
  const parsed = param ? new Date(`${param}T00:00:00`) : new Date();
  return startOfWeek(Number.isNaN(parsed.getTime()) ? new Date() : parsed);
}

export default async function TimesheetsPage({ searchParams }: Props) {
  const { week } = await searchParams;
  const from = parseWeek(week);
  const to = new Date(from);
  to.setDate(to.getDate() + 7);
  const prev = new Date(from);
  prev.setDate(prev.getDate() - 7);

  const viewer = await getCurrentUser();
  const isAdmin = viewer?.role === UserRole.ADMIN;

  const [rows, entries, staff] = await Promise.all([
    getTimesheet({ from: from.toISOString(), to: to.toISOString() }),
    getTimeEntries({ from: from.toISOString(), to: to.toISOString(), limit: 100 }),
    isAdmin ? getUsers({ limit: 100 }) : Promise.resolve(null),
  ]);

  const rates = new Map((staff?.data ?? []).map((u) => [u.id, Number(u.hourlyRate ?? 0)]));
  const totalMinutes = rows.reduce((t, r) => t + r.totalMinutes, 0);
  const totalCost = rows.reduce((t, r) => t + (r.totalMinutes / 60) * (rates.get(r.user.id) ?? 0), 0);
  const lastDay = new Date(to);
  lastDay.setDate(lastDay.getDate() - 1);
  const isCurrentWeek = toDateParam(from) === toDateParam(startOfWeek(new Date()));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Timesheets"
        description={isAdmin ? 'Hours worked by your team.' : 'Your hours worked.'}
        className="mb-0"
        actions={
          isAdmin && staff ? (
            <TimeEntryDialog mode="create" staff={staff.data.map((u) => ({ id: u.id, name: u.name }))} />
          ) : undefined
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="outline" size="icon" aria-label="Previous week">
          <Link href={`/team/timesheets?week=${toDateParam(prev)}`}>
            <ChevronLeft />
          </Link>
        </Button>
        <p className="min-w-56 text-center text-sm font-medium">
          {from.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} –{' '}
          {lastDay.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
        <Button asChild variant="outline" size="icon" aria-label="Next week">
          <Link href={`/team/timesheets?week=${toDateParam(to)}`}>
            <ChevronRight />
          </Link>
        </Button>
        {!isCurrentWeek && (
          <Button asChild variant="ghost" size="sm">
            <Link href="/team/timesheets">This week</Link>
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Summary</CardTitle>
          <p className="text-sm text-muted-foreground">
            {formatMinutes(totalMinutes)} total
            {isAdmin && totalCost > 0 && <> · {formatCurrency(totalCost)} labor</>}
          </p>
        </CardHeader>
        <CardContent className={rows.length === 0 ? undefined : 'px-0 pb-2'}>
          {rows.length === 0 ? (
            <EmptyState icon={<Clock />} message="No time recorded this week." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="px-6">Employee</TableHead>
                  <TableHead className="px-6 text-right">Shifts</TableHead>
                  <TableHead className="px-6 text-right">Hours</TableHead>
                  {isAdmin && <TableHead className="px-6 text-right">Labor cost</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.user.id}>
                    <TableCell className="px-6 font-medium">
                      {r.user.name}
                      {r.openEntries > 0 && (
                        <Badge variant="secondary" className="ml-2 bg-green-100 text-green-700 hover:bg-green-100">
                          On shift
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="px-6 text-right tabular-nums">{r.entryCount}</TableCell>
                    <TableCell className="px-6 text-right tabular-nums">
                      {formatMinutes(r.totalMinutes)}
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="px-6 text-right tabular-nums">
                        {rates.get(r.user.id)
                          ? formatCurrency((r.totalMinutes / 60) * rates.get(r.user.id)!)
                          : '—'}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {entries.data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Shifts</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-2">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  {isAdmin && <TableHead className="px-6">Employee</TableHead>}
                  <TableHead className="px-6">Clock in</TableHead>
                  <TableHead className="px-6">Clock out</TableHead>
                  <TableHead className="px-6 text-right">Duration</TableHead>
                  <TableHead className="hidden px-6 md:table-cell">Notes</TableHead>
                  {isAdmin && (
                    <TableHead className="px-6">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.data.map((e) => (
                  <TableRow key={e.id}>
                    {isAdmin && <TableCell className="px-6 font-medium">{e.user.name}</TableCell>}
                    <TableCell className="px-6">
                      {new Date(e.clockIn).toLocaleString(undefined, {
                        weekday: 'short',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </TableCell>
                    <TableCell className="px-6">
                      {e.clockOut ? (
                        new Date(e.clockOut).toLocaleString(undefined, {
                          weekday: 'short',
                          hour: 'numeric',
                          minute: '2-digit',
                        })
                      ) : (
                        <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100">
                          On shift
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="px-6 text-right tabular-nums">
                      {formatMinutes(e.durationMinutes)}
                    </TableCell>
                    <TableCell className="hidden px-6 text-muted-foreground md:table-cell">
                      {e.notes ?? '—'}
                      {e.editedBy && (
                        <span className="ml-1 text-xs">(edited by {e.editedBy.name})</span>
                      )}
                    </TableCell>
                    {isAdmin && staff && (
                      <TableCell className="px-6 text-right">
                        <div className="flex justify-end gap-1">
                          <TimeEntryDialog
                            mode="edit"
                            entry={e}
                            staff={staff.data.map((u) => ({ id: u.id, name: u.name }))}
                          />
                          <DeleteTimeEntryButton entryId={e.id} />
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
