'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { clientFetch } from '@/lib/api/client';
import { updateTicketSchema, type UpdateTicketInput } from '@/lib/validation/ticket';
import { Priority } from '@repair-shop/shared';
import type { Ticket } from '@/types/ticket';

interface EditTicketFormProps {
  ticket: Ticket;
}

export function EditTicketForm({ ticket }: EditTicketFormProps) {
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
        <label className="block text-sm font-medium text-gray-700">Priority</label>
        <select
          {...register('priority')}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          {Object.values(Priority).map((p) => (
            <option key={p} value={p}>
              {p.charAt(0) + p.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Problem Reported</label>
        <textarea
          {...register('reportedProblem')}
          rows={3}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        {errors.reportedProblem && (
          <p className="mt-1 text-xs text-red-600">{errors.reportedProblem.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Diagnosis</label>
        <textarea
          {...register('diagnosis')}
          rows={3}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Estimated Cost ($)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            {...register('estimatedCost', { valueAsNumber: true })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Final Cost ($)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            {...register('finalCost', { valueAsNumber: true })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Expected Completion</label>
        <input
          type="date"
          {...register('expectedCompletionAt')}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving…' : 'Save Changes'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
