'use client';

import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Loader2, Plus } from 'lucide-react';
import { PaymentMethod, PaymentStatus } from '@repair-shop/shared';
import { clientFetch } from '@/lib/api/client';
import { addPaymentSchema, type AddPaymentFormValues } from '@/lib/validation/payment';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { FieldError } from './field-error';
import type { Payment, PaymentSummary } from '@/types/payment';

interface Props {
  ticketId: string;
  initialSummary: PaymentSummary;
}

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  [PaymentMethod.CASH]: 'Cash',
  [PaymentMethod.CARD]: 'Card',
  [PaymentMethod.BANK_TRANSFER]: 'Bank Transfer',
};

const PAYMENT_STATUS_STYLES: Record<PaymentStatus, string> = {
  [PaymentStatus.COMPLETED]: 'bg-green-100 text-green-800 hover:bg-green-100',
  [PaymentStatus.PENDING]: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
  [PaymentStatus.REFUNDED]: 'bg-zinc-100 text-zinc-700 hover:bg-zinc-100',
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
    control,
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

  const formatAmount = (value: string | null) =>
    value !== null ? `$${parseFloat(value).toFixed(2)}` : '—';

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base">Payments</CardTitle>
        {!summary.isFullyPaid && (
          <Button variant="outline" size="sm" onClick={() => setShowForm((v) => !v)}>
            {!showForm && <Plus />}
            {showForm ? 'Cancel' : 'Add payment'}
          </Button>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Summary */}
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg bg-muted/50 p-4 text-sm">
          <div>
            <dt className="text-muted-foreground">Total cost</dt>
            <dd className="mt-0.5 font-medium">{formatAmount(summary.totalCost)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Paid</dt>
            <dd className="mt-0.5 font-medium text-green-700">
              {formatAmount(summary.paidAmount)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Remaining</dt>
            <dd className="mt-0.5 font-medium text-red-600">
              {formatAmount(summary.remainingAmount)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Status</dt>
            <dd className="mt-0.5">
              {summary.isFullyPaid ? (
                <Badge
                  variant="secondary"
                  className="bg-green-100 font-medium text-green-800 hover:bg-green-100"
                >
                  Paid in full
                </Badge>
              ) : (
                <Badge
                  variant="secondary"
                  className="bg-yellow-100 font-medium text-yellow-800 hover:bg-yellow-100"
                >
                  Outstanding
                </Badge>
              )}
            </dd>
          </div>
        </dl>

        {/* Add payment form */}
        {showForm && (
          <form
            onSubmit={handleSubmit((v) => mutation.mutate(v))}
            className="space-y-4 rounded-lg border p-4"
          >
            <h3 className="text-sm font-semibold">New payment</h3>

            <div className="space-y-2">
              <Label htmlFor="payment-amount">Amount ($)</Label>
              <Input
                id="payment-amount"
                type="number"
                step="0.01"
                min="0.01"
                aria-invalid={!!errors.amount}
                {...register('amount', { valueAsNumber: true })}
              />
              <FieldError message={errors.amount?.message} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-method">Method</Label>
              <Controller
                control={control}
                name="method"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="payment-method" onBlur={field.onBlur}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(PaymentMethod).map((m) => (
                        <SelectItem key={m} value={m}>
                          {PAYMENT_METHOD_LABELS[m]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-status">Status</Label>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="payment-status" onBlur={field.onBlur}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={PaymentStatus.COMPLETED}>Completed</SelectItem>
                      <SelectItem value={PaymentStatus.PENDING}>Pending</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-transaction-id">
                Transaction ID <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input id="payment-transaction-id" type="text" {...register('transactionId')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-notes">
                Notes <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input id="payment-notes" type="text" {...register('notes')} />
            </div>

            {mutation.error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{mutation.error.message}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={mutation.isPending} className="w-full">
              {mutation.isPending && <Loader2 className="animate-spin" />}
              {mutation.isPending ? 'Saving…' : 'Save payment'}
            </Button>
          </form>
        )}

        <Separator />

        {/* Payment history */}
        {summary.payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
        ) : (
          <>
            {completeMutation.error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{completeMutation.error.message}</AlertDescription>
              </Alert>
            )}
            <ul className="divide-y">
              {summary.payments.map((p) => {
                const completing =
                  completeMutation.isPending && completeMutation.variables === p.id;
                return (
                  <li
                    key={p.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm first:pt-0 last:pb-0"
                  >
                    <div>
                      <span className="font-medium">{formatAmount(p.amount)}</span>
                      <span className="ml-2 text-muted-foreground">
                        {PAYMENT_METHOD_LABELS[p.method]}
                      </span>
                      {p.paidAt && (
                        <span className="ml-2 text-muted-foreground">
                          {new Date(p.paidAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {p.status === PaymentStatus.PENDING && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7"
                          onClick={() => completeMutation.mutate(p.id)}
                          disabled={completeMutation.isPending}
                        >
                          {completing ? 'Saving…' : 'Mark as completed'}
                        </Button>
                      )}
                      <Badge
                        variant="secondary"
                        className={cn('font-medium', PAYMENT_STATUS_STYLES[p.status])}
                      >
                        {PAYMENT_STATUS_LABELS[p.status]}
                      </Badge>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
