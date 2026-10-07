'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { clientFetch, ApiError } from '@/lib/api/client';

interface Props {
  customerId: string;
  customerName: string;
}

export function DeleteCustomerButton({ customerId, customerName }: Props) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Delete ${customerName}? This cannot be undone.`)) return;

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
    <div>
      {error && (
        <p role="alert" className="mb-2 text-sm text-red-600">
          {error}
        </p>
      )}
      <button
        onClick={handleDelete}
        disabled={pending}
        className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-60"
      >
        {pending ? 'Deleting…' : 'Delete'}
      </button>
    </div>
  );
}
