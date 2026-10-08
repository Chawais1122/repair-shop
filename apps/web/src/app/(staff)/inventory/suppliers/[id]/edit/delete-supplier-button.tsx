'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { ApiError, clientFetch } from '@/lib/api/client';
import { ConfirmDeleteButton } from '@/components/shared/confirm-delete-button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Props {
  supplierId: string;
  supplierName: string;
}

export function DeleteSupplierButton({ supplierId, supplierName }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    setPending(true);
    setError('');
    try {
      await clientFetch(`/suppliers/${supplierId}`, { method: 'DELETE' });
      router.push('/inventory/suppliers');
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete supplier');
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <ConfirmDeleteButton
        title={`Delete ${supplierName}?`}
        description="Parts linked to this supplier will keep their stock but lose the supplier link. Suppliers with purchase orders cannot be deleted."
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
