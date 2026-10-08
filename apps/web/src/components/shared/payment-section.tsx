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

const inputCls =
  'mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  [PaymentMethod.CASH]: 'Cash',
  [PaymentMethod.CARD]: 'Card',
  [PaymentMethod.BANK_TRANSFER]: 'Bank Transfer',
};

const PAYMENT_STATUS_STYLES: Record<PaymentStatus, string> = {
  [PaymentStatus.COMPLETED]: 'bg-green-100 text-green-800',
  [PaymentStatus.PENDING]: 'bg-yellow-100 text-yellow-800',
  [PaymentStatus.REFUNDED]: 'bg-gray-100 text-gray-700',
};

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  [PaymentStatus.COMPLETED]: 'Completed',
  [PaymentStatus.PENDING]: 'Pending',
  [PaymentStatus.REFUNDED]: 'Refunded',
};

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

  const completeMutation = useMutation<Payment, Error, string>({
    mutationFn: (paymentId) =>
      clientFetch<{ data: Payment }>(`/payments/${paymentId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: PaymentStatus.COMPLETED }),
      }).then((r) => r.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['payments', ticketId] });
    },
  });

  const formatAmount =(value: string | null) =>
    value !== null ? `$${parseFloat(value).toFixed(2)}` : '—';

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Payments</h2>
        {!summary.isFullyPaid && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-300"
          >
            {showForm ? 'Cancel' : 'Add payment'}
          </button>
        )}
      </div>

      {/* Summary */}
      <dl className="mb-4 grid grid-cols-2 gap-x-4 gap-y-3 rounded-md bg-gray-50 p-4 text-sm">
        <div>
          <dt className="text-gray-500">Total cost</dt>
          <dd className="mt-0.5 font-medium text-gray-900">{formatAmount(summary.totalCost)}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Paid</dt>
          <dd className="mt-0.5 font-medium text-green-700">{formatAmount(summary.paidAmount)}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Remaining</dt>
          <dd className="mt-0.5 font-medium text-red-600">{formatAmount(summary.remainingAmount)}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Status</dt>
          <dd className="mt-0.5">
            {summary.isFullyPaid ? (
              <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                Paid in full
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                Outstanding
              </span>
            )}
          </dd>
        </div>
      </dl>

      {/* Add payment form */}
      {showForm && (
        <form
          onSubmit={handleSubmit((v) => mutation.mutate(v))}
          className="mb-5 space-y-4 rounded-md border border-gray-200 bg-gray-50 p-4"
        >
          <h3 className="text-sm font-semibold text-gray-900">New payment</h3>

          <div>
            <label htmlFor="payment-amount" className="block text-sm font-medium text-gray-700">
              Amount ($)
            </label>
            <input
              id="payment-amount"
              type="number"
              step="0.01"
              min="0.01"
              {...register('amount', { valueAsNumber: true })}
              className={inputCls}
            />
            {errors.amount && (
              <p role="alert" className="mt-1.5 text-xs text-red-600">
                {errors.amount.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="payment-method" className="block text-sm font-medium text-gray-700">
              Method
            </label>
            <select id="payment-method" {...register('method')} className={inputCls}>
              {Object.values(PaymentMethod).map((m) => (
                <option key={m} value={m}>
                  {PAYMENT_METHOD_LABELS[m]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="payment-status" className="block text-sm font-medium text-gray-700">
              Status
            </label>
            <select id="payment-status" {...register('status')} className={inputCls}>
              <option value={PaymentStatus.COMPLETED}>Completed</option>
              <option value={PaymentStatus.PENDING}>Pending</option>
            </select>
          </div>

          <div>
            <label htmlFor="payment-transaction-id" className="block text-sm font-medium text-gray-700">
              Transaction ID <span className="text-gray-400">(optional)</span>
            </label>
            <input
              id="payment-transaction-id"
              type="text"
              {...register('transactionId')}
              className={inputCls}
            />
          </div>

          <div>
            <label htmlFor="payment-notes" className="block text-sm font-medium text-gray-700">
              Notes <span className="text-gray-400">(optional)</span>
            </label>
            <input
              id="payment-notes"
              type="text"
              {...register('notes')}
              className={inputCls}
            />
          </div>

          {mutation.error && (
            <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {mutation.error.message}
            </div>
          )}

          <button
            type="submit"
            disabled={mutation.isPending}
            className="inline-flex w-full items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {mutation.isPending ? 'Saving…' : 'Save payment'}
          </button>
        </form>
      )}

      {/* Payment history */}
      {summary.payments.length === 0 ? (
        <p className="text-sm text-gray-400">No payments recorded yet.</p>
      ) : (
        <>
          {completeMutation.error && (
            <div role="alert" className="mb-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {completeMutation.error.message}
            </div>
          )}
          <ul className="divide-y divide-gray-100">
            {summary.payments.map((p) => {
              const completing = completeMutation.isPending && completeMutation.variables === p.id;
              return (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div>
                    <span className="font-medium text-gray-900">{formatAmount(p.amount)}</span>
                    <span className="ml-2 text-gray-500">{PAYMENT_METHOD_LABELS[p.method]}</span>
                    {p.paidAt && (
                      <span className="ml-2 text-gray-400">
                        {new Date(p.paidAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {p.status === PaymentStatus.PENDING && (
                      <button
                        type="button"
                        onClick={() => completeMutation.mutate(p.id)}
                        disabled={completeMutation.isPending}
                        className="inline-flex items-center rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {completing ? 'Saving…' : 'Mark as completed'}
                      </button>
                    )}
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${PAYMENT_STATUS_STYLES[p.status]}`}
                    >
                      {PAYMENT_STATUS_LABELS[p.status]}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
