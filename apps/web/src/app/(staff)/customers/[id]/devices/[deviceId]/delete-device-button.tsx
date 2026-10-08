'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { clientFetch, ApiError } from '@/lib/api/client';
import { ConfirmDeleteButton } from '@/components/shared/confirm-delete-button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Props {
  deviceId: string;
  customerId: string;
  deviceLabel: string;
}

export function DeleteDeviceButton({ deviceId, customerId, deviceLabel }: Props) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  const handleDelete = async () => {
    setError('');
    setPending(true);

    try {
      await clientFetch(`/devices/${deviceId}`, { method: 'DELETE' });
      router.push(`/customers/${customerId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete device');
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <ConfirmDeleteButton
        title={`Delete ${deviceLabel}?`}
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
