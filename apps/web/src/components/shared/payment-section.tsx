'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PaymentMethod, PaymentStatus } from '@repair-shop/shared';
import { clientFetch } from '@/lib/api/client';
import { addPaymentSchema, type AddPaymentFormValues } from '@/lib/validation/payment';
import type { Payment, PaymentSummary } from '@/types/payment';

interface Props {
  ticketId: string;
  initialSummary: PaymentSummary;
}

function paymentMethodLabel(method: PaymentMethod): string {
  const labels: Record<PaymentMethod, string> = {
    [PaymentMethod.CASH]: 'Cash',
    [PaymentMethod.CARD]: 'Card',
    [PaymentMethod.BANK_TRANSFER]: 'Bank Transfer',
  };
  return labels[method];
}

function paymentStatusBadge(status: PaymentStatus): string {
  const styles: Record<PaymentStatus, string> = {
    [PaymentStatus.COMPLETED]: 'bg-green-100 text-green-800',
    [PaymentStatus.PENDING]: 'bg-yellow-100 text-yellow-800',
    [PaymentStatus.REFUNDED]: 'bg-gray-100 text-gray-800',
  };
  return styles[status];
}

export function PaymentSection({ ticketId, initialSummary }: Props) {
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  const { data: summary } = useQuery<PaymentSummary>({
    queryKey: ['payments', ticketId],
    queryFn: async () => {
      const result = await clientFetch<{ data: PaymentSummary }>(
        `/tickets/${ticketId}/payments`,
      );
      return result.data;
    },
    initialData: initialSummary,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddPaymentFormValues>({
    resolver: zodResolver(addPaymentSchema),
    defaultValues: {
      method: PaymentMethod.CASH,
      status: PaymentStatus.COMPLETED,
    },
  });

  const mutation = useMutation<Payment, Error, AddPaymentFormValues>({
    mutationFn: (values) =>
      clientFetch<{ data: Payment }>(`/tickets/${ticketId}/payments`, {
        method: 'POST',
        body: JSON.stringify(values),
      }).then((r) => r.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['payments', ticketId] });
      reset();
      setShowForm(false);
    },
  });

  const formatAmount = (value: string | null) =>
    value !== null ? `$${parseFloat(value).toFixed(2)}` : '—';

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">Payments</h2>
        {!summary.isFullyPaid && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
          >
            {showForm ? 'Cancel' : 'Add Payment'}
          </button>
        )}
      </div>

      <dl className="mb-4 grid grid-cols-2 gap-x-4 gap-y-2 rounded-md bg-gray-50 p-3 text-sm">
        <div>
          <dt className="text-gray-500">Total Cost</dt>
          <dd className="font-medium">{formatAmount(summary.totalCost)}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Paid</dt>
          <dd className="font-medium text-green-700">{formatAmount(summary.paidAmount)}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Remaining</dt>
          <dd className="font-medium text-red-700">{formatAmount(summary.remainingAmount)}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Status</dt>
          <dd>
            {summary.isFullyPaid ? (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                Paid in Full
              </span>
            ) : (
              <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                Outstanding
              </span>
            )}
          </dd>
        </div>
      </dl>

      {showForm && (
        <form
          onSubmit={handleSubmit((v) => mutation.mutate(v))}
          className="mb-4 space-y-3 rounded-md border border-gray-200 p-3"
        >
          <h3 className="text-sm font-medium text-gray-900">New Payment</h3>

          <div>
            <label htmlFor="payment-amount" className="mb-1 block text-xs font-medium text-gray-700">
              Amount ($)
            </label>
            <input
              id="payment-amount"
              type="number"
              step="0.01"
              min="0.01"
              {...register('amount', { valueAsNumber: true })}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
            />
            {errors.amount && (
              <p className="mt-1 text-xs text-red-600">{errors.amount.message}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Method</label>
            <select
              {...register('method')}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
            >
              {Object.values(PaymentMethod).map((m) => (
                <option key={m} value={m}>
                  {paymentMethodLabel(m)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Status</label>
            <select
              {...register('status')}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
            >
              <option value={PaymentStatus.COMPLETED}>Completed</option>
              <option value={PaymentStatus.PENDING}>Pending</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              Transaction ID (optional)
            </label>
            <input
              type="text"
              {...register('transactionId')}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Notes (optional)</label>
            <input
              type="text"
              {...register('notes')}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {mutation.error && (
            <p className="text-xs text-red-600">{mutation.error.message}</p>
          )}

          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full rounded-md bg-indigo-600 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {mutation.isPending ? 'Saving…' : 'Save Payment'}
          </button>
        </form>
      )}

      {summary.payments.length === 0 ? (
        <p className="text-sm text-gray-400">No payments recorded.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {summary.payments.map((p) => (
            <li key={p.id} className="flex items-center justify-between py-2 text-sm">
              <div>
                <span className="font-medium">{formatAmount(p.amount)}</span>
                <span className="ml-2 text-gray-500">{paymentMethodLabel(p.method)}</span>
                {p.paidAt && (
                  <span className="ml-2 text-gray-400">
                    {new Date(p.paidAt).toLocaleDateString()}
                  </span>
                )}
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${paymentStatusBadge(p.status)}`}
              >
                {p.status.toLowerCase()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
