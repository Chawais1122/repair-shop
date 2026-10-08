'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Loader2 } from 'lucide-react';
import { clientFetch, ApiError } from '@/lib/api/client';
import { updateTicketSchema, type UpdateTicketInput } from '@/lib/validation/ticket';
import { Priority } from '@repair-shop/shared';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FieldError } from '@/components/shared/field-error';
import type { Ticket } from '@/types/ticket';

interface Props {
  ticket: Ticket;
}

// Empty number inputs would otherwise become NaN and fail validation silently
const toOptionalNumber = (v: unknown): number | undefined =>
  v === '' || v === null || v === undefined ? undefined : Number(v);

export function EditTicketForm({ ticket }: Props) {
  const router = useRouter();
  const [serverError, setServerError] = useState('');
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UpdateTicketInput>({
    resolver: zodResolver(updateTicketSchema),
    defaultValues: {
      priority: ticket.priority,
      reportedProblem: ticket.reportedProblem,
      diagnosis: ticket.diagnosis ?? '',
      estimatedCost: ticket.estimatedCost ? Number(ticket.estimatedCost) : undefined,
      finalCost: ticket.finalCost ? Number(ticket.finalCost) : undefined,
      expectedCompletionAt: ticket.expectedCompletionAt
        ? ticket.expectedCompletionAt.substring(0, 10)
        : '',
    },
  });

  async function onSubmit(data: UpdateTicketInput) {
    setServerError('');
    try {
      await clientFetch(`/tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        // Empty date input yields '' which the API's IsDateString rejects
        body: JSON.stringify({
          ...data,
          expectedCompletionAt: data.expectedCompletionAt || undefined,
        }),
      });
      router.push(`/tickets/${ticket.id}`);
      router.refresh();
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'Failed to update ticket');
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {serverError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="priority">Priority</Label>
        <Controller
          control={control}
          name="priority"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="priority" onBlur={field.onBlur}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(Priority).map((p) => (
                  <SelectItem key={p} value={p}>
                    {p.charAt(0) + p.slice(1).toLowerCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="reportedProblem">Problem reported</Label>
        <Textarea
          id="reportedProblem"
          {...register('reportedProblem')}
          rows={3}
          aria-invalid={!!errors.reportedProblem}
        />
        <FieldError message={errors.reportedProblem?.message} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="diagnosis">Diagnosis</Label>
        <Textarea id="diagnosis" {...register('diagnosis')} rows={3} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="estimatedCost">Estimated cost ($)</Label>
          <Input
            id="estimatedCost"
            type="number"
            step="0.01"
            min="0"
            aria-invalid={!!errors.estimatedCost}
            {...register('estimatedCost', { setValueAs: toOptionalNumber })}
          />
          <FieldError message={errors.estimatedCost?.message} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="finalCost">Final cost ($)</Label>
          <Input
            id="finalCost"
            type="number"
            step="0.01"
            min="0"
            aria-invalid={!!errors.finalCost}
            {...register('finalCost', { setValueAs: toOptionalNumber })}
          />
          <FieldError message={errors.finalCost?.message} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="expectedCompletionAt">Expected completion</Label>
        <Input id="expectedCompletionAt" type="date" {...register('expectedCompletionAt')} />
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" />}
          {isSubmitting ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}
