'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, Banknote, CreditCard, Landmark, Loader2 } from 'lucide-react';
import { PaymentMethod } from '@repair-shop/shared';
import { ApiError, clientFetch } from '@/lib/api/client';
import { formatCurrency } from '@/lib/format';
import { fromCents, toCents } from '@/lib/money';
import { cn } from '@/lib/utils';
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
import type { Invoice } from '@/types/invoice';

const METHODS = [
  { value: PaymentMethod.CASH, label: 'Cash', icon: Banknote },
  { value: PaymentMethod.CARD, label: 'Card', icon: CreditCard },
  { value: PaymentMethod.BANK_TRANSFER, label: 'Bank', icon: Landmark },
] as const;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  invoiceNumber: string;
  balanceDue: string;
  /** Called after each recorded payment with the updated invoice and any cash change due. */
  onPaid: (invoice: Invoice, changeDue: number) => void;
}

export function TakePaymentDialog({
  open,
  onOpenChange,
  invoiceId,
  invoiceNumber,
  balanceDue,
  onPaid,
}: Props) {
  const balanceCents = toCents(balanceDue);
  const [method, setMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [amount, setAmount] = useState('');
  const [tendered, setTendered] = useState('');
  const [reference, setReference] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setAmount(fromCents(balanceCents).toFixed(2));
      setTendered('');
      setReference('');
      setError('');
    }
  }, [open, balanceCents]);

  const amountCents = toCents(amount || 0);
  const tenderedCents = tendered ? toCents(tendered) : null;
  const changeCents =
    method === PaymentMethod.CASH && tenderedCents !== null ? tenderedCents - amountCents : 0;

  function validate(): string | null {
    if (!Number.isFinite(Number(amount)) || amountCents <= 0) return 'Enter an amount to charge';
    if (amountCents > balanceCents) {
      return `Amount cannot exceed the balance of ${formatCurrency(fromCents(balanceCents))}`;
    }
    if (method === PaymentMethod.CASH && tenderedCents !== null && tenderedCents < amountCents) {
      return 'Cash received is less than the amount being paid';
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await clientFetch<{ data: Invoice }>(`/invoices/${invoiceId}/payments`, {
        method: 'POST',
        body: JSON.stringify({
          amount: fromCents(amountCents),
          method,
          transactionId: method !== PaymentMethod.CASH && reference ? reference : undefined,
        }),
      });
      onPaid(res.data, Math.max(0, fromCents(changeCents)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Payment failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Take payment</DialogTitle>
          <DialogDescription>
            {invoiceNumber} · Balance due{' '}
            <span className="font-semibold text-foreground">
              {formatCurrency(fromCents(balanceCents))}
            </span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Method</legend>
            <div className="grid grid-cols-3 gap-2">
              {METHODS.map((m) => {
                const Icon = m.icon;
                const selected = method === m.value;
                return (
                  <button
                    key={m.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setMethod(m.value)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 rounded-lg border p-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                      selected
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'hover:bg-accent',
                    )}
                  >
                    <Icon className="size-5" aria-hidden="true" />
                    {m.label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="space-y-2">
            <Label htmlFor="payment-amount">Amount to charge ($)</Label>
            <Input
              id="payment-amount"
              type="number"
              step="0.01"
              min="0.01"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Enter less than the balance to split the payment across methods.
            </p>
          </div>

          {method === PaymentMethod.CASH ? (
            <div className="space-y-2">
              <Label htmlFor="cash-tendered">Cash received ($)</Label>
              <Input
                id="cash-tendered"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                placeholder="Optional"
                value={tendered}
                onChange={(e) => setTendered(e.target.value)}
              />
              {tenderedCents !== null && changeCents >= 0 && (
                <p className="text-sm">
                  Change due:{' '}
                  <span className="font-semibold">{formatCurrency(fromCents(changeCents))}</span>
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="payment-reference">Reference / transaction ID</Label>
              <Input
                id="payment-reference"
                placeholder="Optional"
                value={reference}
                maxLength={100}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              Charge {formatCurrency(fromCents(amountCents > 0 ? amountCents : 0))}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
