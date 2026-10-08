'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError, clientFetch } from '@/lib/api/client';
import { formatCurrency } from '@/lib/format';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

interface Props {
  invoiceId: string;
  paymentId: string;
  amount: string;
}

export function RefundPaymentButton({ invoiceId, paymentId, amount }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function refund() {
    setPending(true);
    setError('');
    try {
      await clientFetch(`/invoices/${invoiceId}/payments/${paymentId}/refund`, {
        method: 'POST',
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Refund failed');
    } finally {
      setPending(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="sm" disabled={pending}>
            {pending ? 'Refunding…' : 'Refund'}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Refund {formatCurrency(amount)}?</AlertDialogTitle>
            <AlertDialogDescription>
              Record that this payment was returned to the customer. The invoice balance will
              increase by the same amount.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={refund}>Record refund</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </span>
  );
}
