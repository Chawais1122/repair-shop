'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { clientFetch } from '@/lib/api/client';
import { updateTicketSchema, type UpdateTicketInput } from '@/lib/validation/ticket';
import { Priority } from '@repair-shop/shared';
import type { Ticket } from '@/types/ticket';

interface Props {
  ticket: Ticket;
}

const inputCls =
  'mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';

export function EditTicketForm({ ticket }: Props) {
  const router = useRouter();
  const {
    register,
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
    await clientFetch(`/tickets/${ticket.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    router.push(`/tickets/${ticket.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
          Priority
        </label>
        <select id="priority" {...register('priority')} className={inputCls}>
          {Object.values(Priority).map((p) => (
            <option key={p} value={p}>
              {p.charAt(0) + p.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="reportedProblem" className="block text-sm font-medium text-gray-700">
          Problem reported
        </label>
        <textarea
          id="reportedProblem"
          {...register('reportedProblem')}
          rows={3}
          className={inputCls}
        />
        {errors.reportedProblem && (
          <p role="alert" className="mt-1.5 text-xs text-red-600">
            {errors.reportedProblem.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="diagnosis" className="block text-sm font-medium text-gray-700">
          Diagnosis
        </label>
        <textarea id="diagnosis" {...register('diagnosis')} rows={3} className={inputCls} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="estimatedCost" className="block text-sm font-medium text-gray-700">
            Estimated cost ($)
          </label>
          <input
            id="estimatedCost"
            type="number"
            step="0.01"
            min="0"
            {...register('estimatedCost', { valueAsNumber: true })}
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="finalCost" className="block text-sm font-medium text-gray-700">
            Final cost ($)
          </label>
          <input
            id="finalCost"
            type="number"
            step="0.01"
            min="0"
            {...register('finalCost', { valueAsNumber: true })}
            className={inputCls}
          />
        </div>
      </div>

      <div>
        <label htmlFor="expectedCompletionAt" className="block text-sm font-medium text-gray-700">
          Expected completion
        </label>
        <input
          id="expectedCompletionAt"
          type="date"
          {...register('expectedCompletionAt')}
          className={inputCls}
        />
      </div>

      <div className="flex justify-end gap-3 pt-1">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-300"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}
