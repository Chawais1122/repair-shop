'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Archive } from 'lucide-react';
import { ApiError, clientFetch } from '@/lib/api/client';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';

interface Props {
  partId: string;
  partName: string;
}

export function DeactivatePartButton({ partId, partName }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  const handleDeactivate = async () => {
    setPending(true);
    setError('');
    try {
      await clientFetch(`/parts/${partId}`, { method: 'DELETE' });
      router.push('/inventory');
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to deactivate part');
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" disabled={pending}>
            <Archive />
            {pending ? 'Deactivating…' : 'Deactivate'}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate {partName}?</AlertDialogTitle>
            <AlertDialogDescription>
              It will be hidden from inventory and can no longer be sold or used on tickets. Its
              stock and sales history are kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: 'destructive' })}
              onClick={handleDeactivate}
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {error && (
        <Alert variant="destructive" className="max-w-xs">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
