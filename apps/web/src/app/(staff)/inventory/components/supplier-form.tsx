'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Loader2 } from 'lucide-react';
import { ApiError, clientFetch } from '@/lib/api/client';
import { supplierSchema, type SupplierFormValues } from '@/lib/validation/inventory';
import { FieldError } from '@/components/shared/field-error';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Supplier } from '@/types/inventory';

interface Props {
  mode: 'create' | 'edit';
  supplier?: Supplier;
}

export function SupplierForm({ mode, supplier }: Props) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: supplier?.name ?? '',
      contactName: supplier?.contactName ?? '',
      email: supplier?.email ?? '',
      phone: supplier?.phone ?? '',
      website: supplier?.website ?? '',
      notes: supplier?.notes ?? '',
    },
  });

  const onSubmit = async (values: SupplierFormValues) => {
    // On edit, null clears a field; undefined would leave the stored value untouched
    const empty = mode === 'create' ? undefined : null;
    const payload = Object.fromEntries(
      Object.entries(values).map(([k, v]) => [k, v === '' ? empty : v]),
    );

    try {
      await clientFetch(mode === 'create' ? '/suppliers' : `/suppliers/${supplier!.id}`, {
        method: mode === 'create' ? 'POST' : 'PATCH',
        body: JSON.stringify(payload),
      });
      router.push('/inventory/suppliers');
      router.refresh();
    } catch (err) {
      setError('root', {
        message: err instanceof ApiError ? err.message : 'Something went wrong. Please try again.',
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      {errors.root && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errors.root.message}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">
            Name <span className="text-destructive" aria-hidden="true">*</span>
          </Label>
          <Input id="name" aria-invalid={!!errors.name} {...register('name')} />
          <FieldError message={errors.name?.message} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contactName">Contact person</Label>
          <Input
            id="contactName"
            aria-invalid={!!errors.contactName}
            {...register('contactName')}
          />
          <FieldError message={errors.contactName?.message} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" aria-invalid={!!errors.email} {...register('email')} />
          <FieldError message={errors.email?.message} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" type="tel" aria-invalid={!!errors.phone} {...register('phone')} />
          <FieldError message={errors.phone?.message} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            type="url"
            placeholder="https://"
            aria-invalid={!!errors.website}
            {...register('website')}
          />
          <FieldError message={errors.website?.message} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          rows={3}
          placeholder="Account number, ordering cut-off times…"
          aria-invalid={!!errors.notes}
          {...register('notes')}
        />
        <FieldError message={errors.notes?.message} />
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" />}
          {mode === 'create' ? 'Create supplier' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}
