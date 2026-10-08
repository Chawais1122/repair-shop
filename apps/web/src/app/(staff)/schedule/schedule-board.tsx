'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { AlertCircle, Plane, Plus } from 'lucide-react';
import type { UserRole } from '@repair-shop/shared';
import { ApiError, clientFetch } from '@/lib/api/client';
import { formatMinutes, toDateParam } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { Shift, TimeOffRequest } from '@/types/schedule';
import { ShiftDialog, type ShiftDialogState } from './shift-dialog';

interface Props {
  weekStart: string;
  staff: Array<{ id: string; name: string; role: UserRole }>;
  shifts: Shift[];
  timeOff: TimeOffRequest[];
  canEdit: boolean;
  viewerId: string;
}

const timeFmt = (iso: string): string =>
  new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

const shiftMinutes = (s: Shift): number =>
  Math.round((new Date(s.endsAt).getTime() - new Date(s.startsAt).getTime()) / 60_000);

export function ScheduleBoard({ weekStart, staff, shifts, timeOff, canEdit, viewerId }: Props) {
  const router = useRouter();
  const [items, setItems] = useState(shifts);
  const [dialog, setDialog] = useState<ShiftDialogState>(null);
  const [dragging, setDragging] = useState<Shift | null>(null);
  const [error, setError] = useState('');

  useEffect(() => setItems(shifts), [shifts]);

  const days = useMemo(() => {
    const start = new Date(weekStart);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekStart]);
  const dayKeys = days.map(toDateParam);
  const todayKey = toDateParam(new Date());

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const shiftsByCell = useMemo(() => {
    const map = new Map<string, Shift[]>();
    for (const s of items) {
      const key = `${s.user.id}|${toDateParam(new Date(s.startsAt))}`;
      map.set(key, [...(map.get(key) ?? []), s]);
    }
    return map;
  }, [items]);

  const isOff = (userId: string, key: string): boolean =>
    timeOff.some((t) => t.user.id === userId && t.startDate <= key && t.endDate >= key);

  async function handleDragEnd(event: DragEndEvent) {
    setDragging(null);
    const shift = event.active.data.current?.shift as Shift | undefined;
    const target = event.over?.id as string | undefined;
    if (!shift || !target) return;

    const [userId, dayIndex] = target.split('|');
    const targetDay = days[Number(dayIndex)]!;
    const start = new Date(shift.startsAt);
    const duration = new Date(shift.endsAt).getTime() - start.getTime();
    const startsAt = new Date(targetDay);
    startsAt.setHours(start.getHours(), start.getMinutes(), 0, 0);
    if (userId === shift.user.id && startsAt.getTime() === start.getTime()) return;
    const endsAt = new Date(startsAt.getTime() + duration);
    const user = staff.find((s) => s.id === userId)!;

    const previous = items;
    setError('');
    setItems((current) =>
      current.map((s) =>
        s.id === shift.id
          ? {
              ...s,
              user: { id: user.id, name: user.name },
              startsAt: startsAt.toISOString(),
              endsAt: endsAt.toISOString(),
            }
          : s,
      ),
    );
    try {
      await clientFetch(`/shifts/${shift.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          userId,
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString(),
        }),
      });
      router.refresh();
    } catch (err) {
      setItems(previous);
      setError(err instanceof ApiError ? err.message : 'Could not move the shift');
    }
  }

  return (
    <div className="space-y-3">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <DndContext
        sensors={sensors}
        onDragStart={(e) => setDragging((e.active.data.current?.shift as Shift) ?? null)}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setDragging(null)}
      >
        <div className="overflow-x-auto rounded-xl border bg-card">
          <div className="min-w-[960px]" role="table" aria-label="Weekly schedule">
            <div
              role="row"
              className="grid grid-cols-[180px_repeat(7,minmax(0,1fr))] border-b bg-muted/40"
            >
              <div role="columnheader" className="px-3 py-2 text-xs font-medium text-muted-foreground">
                Employee
              </div>
              {days.map((d, i) => (
                <div
                  key={dayKeys[i]}
                  role="columnheader"
                  className={cn(
                    'border-l px-2 py-2 text-center text-xs font-medium',
                    dayKeys[i] === todayKey ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {d.toLocaleDateString(undefined, { weekday: 'short' })}
                  <span
                    className={cn(
                      'ml-1 inline-flex size-5 items-center justify-center rounded-full',
                      dayKeys[i] === todayKey && 'bg-primary text-primary-foreground',
                    )}
                  >
                    {d.getDate()}
                  </span>
                </div>
              ))}
            </div>

            {staff.map((person) => {
              const weekMinutes = items
                .filter((s) => s.user.id === person.id)
                .reduce((t, s) => t + shiftMinutes(s), 0);
              return (
                <div
                  key={person.id}
                  role="row"
                  className={cn(
                    'grid grid-cols-[180px_repeat(7,minmax(0,1fr))] border-b last:border-0',
                    person.id === viewerId && 'bg-primary/[0.03]',
                  )}
                >
                  <div role="rowheader" className="px-3 py-2">
                    <p className="truncate text-sm font-medium">
                      {person.name}
                      {person.id === viewerId && (
                        <span className="ml-1 text-xs font-normal text-muted-foreground">(you)</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatMinutes(weekMinutes)} planned</p>
                  </div>
                  {dayKeys.map((key, dayIndex) => (
                    <DayCell
                      key={key}
                      id={`${person.id}|${dayIndex}`}
                      shifts={shiftsByCell.get(`${person.id}|${key}`) ?? []}
                      off={isOff(person.id, key)}
                      canEdit={canEdit}
                      dragging={dragging !== null}
                      onAdd={() =>
                        setDialog({ mode: 'create', userId: person.id, date: days[dayIndex]! })
                      }
                      onEdit={(shift) => setDialog({ mode: 'edit', shift })}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        <DragOverlay>{dragging && <ShiftChip shift={dragging} overlay />}</DragOverlay>
      </DndContext>

      {canEdit && (
        <ShiftDialog
          state={dialog}
          staff={staff}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

interface DayCellProps {
  id: string;
  shifts: Shift[];
  off: boolean;
  canEdit: boolean;
  dragging: boolean;
  onAdd: () => void;
  onEdit: (shift: Shift) => void;
}

function DayCell({ id, shifts, off, canEdit, dragging, onAdd, onEdit }: DayCellProps) {
  const { setNodeRef, isOver } = useDroppable({ id, disabled: !canEdit });

  return (
    <div
      ref={setNodeRef}
      role="cell"
      className={cn(
        'group relative min-h-16 space-y-1 border-l p-1.5 transition-colors',
        isOver && 'bg-primary/10',
        off &&
          'bg-[repeating-linear-gradient(45deg,transparent,transparent_6px,hsl(var(--muted))_6px,hsl(var(--muted))_12px)]',
      )}
    >
      {off && (
        <p className="flex items-center gap-1 rounded bg-background/80 px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
          <Plane className="size-3" aria-hidden="true" />
          Time off
        </p>
      )}
      {shifts.map((s) =>
        canEdit ? (
          <DraggableShift key={s.id} shift={s} onEdit={() => onEdit(s)} />
        ) : (
          <ShiftChip key={s.id} shift={s} />
        ),
      )}
      {canEdit && !dragging && (
        <button
          type="button"
          onClick={onAdd}
          aria-label="Add shift"
          className="flex h-6 w-full items-center justify-center rounded border border-dashed text-muted-foreground opacity-0 transition-opacity hover:bg-accent focus-visible:opacity-100 group-hover:opacity-100"
        >
          <Plus className="size-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

function DraggableShift({ shift, onEdit }: { shift: Shift; onEdit: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: shift.id,
    data: { shift },
  });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      aria-roledescription="Draggable shift"
      className={cn('touch-none', isDragging && 'opacity-40')}
    >
      <button type="button" onClick={onEdit} className="w-full text-left">
        <ShiftChip shift={shift} interactive />
      </button>
    </div>
  );
}

function ShiftChip({
  shift,
  overlay = false,
  interactive = false,
}: {
  shift: Shift;
  overlay?: boolean;
  interactive?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-md border border-l-4 border-l-chart-1 bg-background px-1.5 py-1 text-[11px] leading-tight shadow-sm',
        interactive && 'cursor-grab hover:bg-accent active:cursor-grabbing',
        overlay && 'cursor-grabbing shadow-lg',
      )}
    >
      <p className="font-medium tabular-nums">
        {timeFmt(shift.startsAt)}–{timeFmt(shift.endsAt)}
      </p>
      {shift.notes && <p className="truncate text-muted-foreground">{shift.notes}</p>}
    </div>
  );
}
