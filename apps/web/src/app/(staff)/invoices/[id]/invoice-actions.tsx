'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, Ban, CreditCard, Loader2, Printer } from 'lucide-react';
import { InvoiceStatus } from '@repair-shop/shared';
import { ApiError, clientFetch } from '@/lib/api/client';
import { TakePaymentDialog } from '@/components/shared/take-payment-dialog';
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
import type { Invoice } from '@/types/invoice';

interface Props {
  invoice: Invoice;
  isAdmin: boolean;
}

export function InvoiceActions({ invoice, isAdmin }: Props) {
  const router = useRouter();
  const [paymentOpen, setPaymentOpen] = useState(false);
  const isVoid = invoice.status === InvoiceStatus.VOID;
  const hasBalance = Number(invoice.balanceDue) > 0;

  return (
    <>
      <Button asChild variant="outline">
        <Link href={`/invoices/${invoice.id}/receipt`} target="_blank">
          <Printer />
          Print
        </Link>
      </Button>
      {!isVoid && hasBalance && (
        <Button onClick={() => setPaymentOpen(true)}>
          <CreditCard />
          Take payment
        </Button>
      )}
      {!isVoid && isAdmin && <VoidInvoiceDialog invoiceId={invoice.id} />}

      <TakePaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        invoiceId={invoice.id}
        invoiceNumber={invoice.invoiceNumber}
        balanceDue={invoice.balanceDue}
        onPaid={(updated) => {
          if (Number(updated.balanceDue) <= 0) setPaymentOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}

function VoidInvoiceDialog({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function handleVoid(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) {
      setError('A reason is required');
      return;
    }
    setPending(true);
    setError('');
    try {
      await clientFetch(`/invoices/${invoiceId}/void`, {
        method: 'POST',
        body: JSON.stringify({ reason: reason.trim() }),
      });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to void invoice');
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setReason('');
          setError('');
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="destructive">
          <Ban />
          Void
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Void invoice?</DialogTitle>
          <DialogDescription>
            Sold products go back into stock and a linked repair can be invoiced again. Refund any
            payments taken on this invoice first.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleVoid} noValidate className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="void-reason">Reason</Label>
            <Input
              id="void-reason"
              value={reason}
              maxLength={300}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Rung up by mistake, customer cancelled…"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Keep invoice
            </Button>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              Void invoice
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
