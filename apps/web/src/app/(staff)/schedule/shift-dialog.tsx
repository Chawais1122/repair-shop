'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, Loader2, Trash2 } from 'lucide-react';
import { ApiError, clientFetch } from '@/lib/api/client';
import { toDateParam } from '@/lib/format';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Shift } from '@/types/schedule';

export type ShiftDialogState =
  | { mode: 'create'; userId: string; date: Date }
  | { mode: 'edit'; shift: Shift }
  | null;

interface Props {
  state: ShiftDialogState;
  staff: Array<{ id: string; name: string }>;
  onClose: () => void;
  onSaved: () => void;
}

const hhmm = (d: Date): string =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

/** Builds start/end instants; an end time earlier than the start means the shift runs past midnight. */
export function shiftInstants(date: string, start: string, end: string): { startsAt: Date; endsAt: Date } {
  const startsAt = new Date(`${date}T${start}:00`);
  const endsAt = new Date(`${date}T${end}:00`);
  if (endsAt <= startsAt) endsAt.setDate(endsAt.getDate() + 1);
  return { startsAt, endsAt };
}

export function ShiftDialog({ state, staff, onClose, onSaved }: Props) {
  const [userId, setUserId] = useState('');
  const [date, setDate] = useState('');
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('17:00');
  const [notes, setNotes] = useState('');
  const [pending, setPending] = useState<'save' | 'delete' | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!state) return;
    setError('');
    if (state.mode === 'create') {
      setUserId(state.userId);
      setDate(toDateParam(state.date));
      setStart('09:00');
      setEnd('17:00');
      setNotes('');
    } else {
      const s = new Date(state.shift.startsAt);
      setUserId(state.shift.user.id);
      setDate(toDateParam(s));
      setStart(hhmm(s));
      setEnd(hhmm(new Date(state.shift.endsAt)));
      setNotes(state.shift.notes ?? '');
    }
  }, [state]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !date || !start || !end) {
      setError('Employee, date and times are required');
      return;
    }
    const { startsAt, endsAt } = shiftInstants(date, start, end);
    setPending('save');
    setError('');
    try {
      const body = JSON.stringify({
        userId,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        notes: notes || (state?.mode === 'edit' ? null : undefined),
      });
      if (state?.mode === 'edit') {
        await clientFetch(`/shifts/${state.shift.id}`, { method: 'PATCH', body });
      } else {
        await clientFetch('/shifts', { method: 'POST', body });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the shift');
    } finally {
      setPending(null);
    }
  }

  async function remove() {
    if (state?.mode !== 'edit') return;
    setPending('delete');
    setError('');
    try {
      await clientFetch(`/shifts/${state.shift.id}`, { method: 'DELETE' });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete the shift');
    } finally {
      setPending(null);
    }
  }

  return (
    <Dialog open={state !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{state?.mode === 'edit' ? 'Edit shift' : 'Add shift'}</DialogTitle>
          <DialogDescription>
            An end time earlier than the start time runs past midnight.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={save} noValidate className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="shift-user">Employee</Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger id="shift-user">
                <SelectValue placeholder="Select an employee" />
              </SelectTrigger>
              <SelectContent>
                {staff.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-3 space-y-2 sm:col-span-1">
              <Label htmlFor="shift-date">Date</Label>
              <Input
                id="shift-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shift-start">Start</Label>
              <Input
                id="shift-start"
                type="time"
                step={900}
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shift-end">End</Label>
              <Input
                id="shift-end"
                type="time"
                step={900}
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="shift-notes">Notes</Label>
            <Input
              id="shift-notes"
              maxLength={200}
              placeholder="Opening, bench, front desk…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            {state?.mode === 'edit' ? (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={remove}
                disabled={pending !== null}
              >
                {pending === 'delete' ? <Loader2 className="animate-spin" /> : <Trash2 />}
                Delete
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending !== null}>
                {pending === 'save' && <Loader2 className="animate-spin" />}
                Save shift
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
