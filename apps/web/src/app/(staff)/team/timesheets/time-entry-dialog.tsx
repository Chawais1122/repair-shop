'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Loader2, Pencil, Plus } from 'lucide-react';
import { ApiError, clientFetch } from '@/lib/api/client';
import { toDateTimeLocal } from '@/lib/format';
import { timeEntrySchema, type TimeEntryFormValues } from '@/lib/validation/team';
import { FieldError } from '@/components/shared/field-error';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import type { TimeEntry } from '@/types/team';

interface Props {
  mode: 'create' | 'edit';
  entry?: TimeEntry;
  staff: Array<{ id: string; name: string }>;
}

export function TimeEntryDialog({ mode, entry, staff }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const defaults: TimeEntryFormValues = {
    userId: entry?.user.id ?? '',
    clockIn: entry ? toDateTimeLocal(entry.clockIn) : '',
    clockOut: entry?.clockOut ? toDateTimeLocal(entry.clockOut) : '',
    notes: entry?.notes ?? '',
  };

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<TimeEntryFormValues>({
    resolver: zodResolver(timeEntrySchema),
    defaultValues: defaults,
  });

  const onSubmit = async (values: TimeEntryFormValues) => {
    const clockIn = new Date(values.clockIn).toISOString();
    const clockOut = values.clockOut ? new Date(values.clockOut).toISOString() : null;
    try {
      if (mode === 'create') {
        await clientFetch('/time-entries', {
          method: 'POST',
          body: JSON.stringify({
            userId: values.userId,
            clockIn,
            clockOut: clockOut ?? undefined,
            notes: values.notes || undefined,
          }),
        });
      } else {
        await clientFetch(`/time-entries/${entry!.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ clockIn, clockOut, notes: values.notes || null }),
        });
      }
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError('root', { message: err instanceof ApiError ? err.message : 'Save failed' });
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) reset(defaults);
      }}
    >
      <DialogTrigger asChild>
        {mode === 'create' ? (
          <Button>
            <Plus />
            Add shift
          </Button>
        ) : (
          <Button variant="ghost" size="icon" className="size-8" aria-label="Edit shift">
            <Pencil />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Add shift' : 'Edit shift'}</DialogTitle>
          <DialogDescription>
            Correct missed or wrong clock-ins. Leave clock-out empty if they&apos;re still on shift.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          {errors.root && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.root.message}</AlertDescription>
            </Alert>
          )}
          {mode === 'create' && (
            <div className="space-y-2">
              <Label htmlFor="entry-user">Employee</Label>
              <Controller
                control={control}
                name="userId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="entry-user" aria-invalid={!!errors.userId}>
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
                )}
              />
              <FieldError message={errors.userId?.message} />
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="entry-in">Clock in</Label>
              <Input
                id="entry-in"
                type="datetime-local"
                aria-invalid={!!errors.clockIn}
                {...register('clockIn')}
              />
              <FieldError message={errors.clockIn?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="entry-out">Clock out</Label>
              <Input
                id="entry-out"
                type="datetime-local"
                aria-invalid={!!errors.clockOut}
                {...register('clockOut')}
              />
              <FieldError message={errors.clockOut?.message} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="entry-notes">Notes</Label>
            <Input id="entry-notes" maxLength={300} {...register('notes')} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
