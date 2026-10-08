'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { clientFetch, ApiError } from '@/lib/api/client';
import { ConfirmDeleteButton } from '@/components/shared/confirm-delete-button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Props {
  customerId: string;
  customerName: string;
}

export function DeleteCustomerButton({ customerId, customerName }: Props) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  const handleDelete = async () => {
    setError('');
    setPending(true);

    try {
      await clientFetch(`/customers/${customerId}`, { method: 'DELETE' });
      router.push('/customers');
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete customer');
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <ConfirmDeleteButton
        title={`Delete ${customerName}?`}
        description="This cannot be undone."
        pending={pending}
        onConfirm={handleDelete}
      />
      {error && (
        <Alert variant="destructive" className="max-w-xs">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
