'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { clientFetch, ApiError } from '@/lib/api/client';

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
    if (!confirm(`Delete ${deviceLabel}? This cannot be undone.`)) return;

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
    <div>
      {error && (
        <div
          role="alert"
          className="mb-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}
      <button
        onClick={handleDelete}
        disabled={pending}
        className="inline-flex items-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? 'Deleting…' : 'Delete'}
      </button>
    </div>
  );
}
