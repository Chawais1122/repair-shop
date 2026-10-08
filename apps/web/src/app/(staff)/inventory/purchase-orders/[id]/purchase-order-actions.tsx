'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, Ban, PackageCheck, Pencil, Send } from 'lucide-react';
import { PurchaseOrderStatus } from '@repair-shop/shared';
import { ApiError, clientFetch } from '@/lib/api/client';
import { ConfirmDeleteButton } from '@/components/shared/confirm-delete-button';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  orderId: string;
  status: PurchaseOrderStatus;
}

export function PurchaseOrderActions({ orderId, status }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function run(key: string, path: string, init: RequestInit, redirectTo?: string) {
    setPending(key);
    setError('');
    try {
      await clientFetch(path, init);
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Action failed. Please try again.');
    } finally {
      setPending(null);
    }
  }

  const setStatus = (next: PurchaseOrderStatus) =>
    run(next, `/purchase-orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: next }),
    });

  const isDraft = status === PurchaseOrderStatus.DRAFT;
  const isOrdered = status === PurchaseOrderStatus.ORDERED;

  if (!isDraft && !isOrdered) return null;

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        {isDraft && (
          <>
            <Button asChild variant="outline">
              <Link href={`/inventory/purchase-orders/${orderId}/edit`}>
                <Pencil />
                Edit
              </Link>
            </Button>
            <Button
              onClick={() => setStatus(PurchaseOrderStatus.ORDERED)}
              disabled={pending !== null}
            >
              <Send />
              {pending === PurchaseOrderStatus.ORDERED ? 'Saving…' : 'Mark as ordered'}
            </Button>
          </>
        )}

        {isOrdered && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={pending !== null}>
                <PackageCheck />
                {pending === 'receive' ? 'Receiving…' : 'Receive into stock'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Receive this order?</AlertDialogTitle>
                <AlertDialogDescription>
                  Every item will be added to stock and each part&apos;s cost will be updated to
                  the price on this order. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() =>
                    run('receive', `/purchase-orders/${orderId}/receive`, { method: 'POST' })
                  }
                >
                  Receive
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        <Button
          variant="outline"
          onClick={() => setStatus(PurchaseOrderStatus.CANCELLED)}
          disabled={pending !== null}
        >
          <Ban />
          {pending === PurchaseOrderStatus.CANCELLED ? 'Cancelling…' : 'Cancel order'}
        </Button>

        {isDraft && (
          <ConfirmDeleteButton
            title="Delete this draft?"
            description="The draft purchase order will be permanently removed."
            pending={pending === 'delete'}
            onConfirm={() =>
              run(
                'delete',
                `/purchase-orders/${orderId}`,
                { method: 'DELETE' },
                '/inventory/purchase-orders',
              )
            }
          />
        )}
      </div>
      {error && (
        <Alert variant="destructive" className="max-w-sm">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
