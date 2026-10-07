'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { clientFetch, ApiError } from '@/lib/api/client';
import { customerSchema, type CustomerFormValues } from '@/lib/validation/customer';
import type { Customer } from '@/types/customer';

interface Props {
  mode: 'create' | 'edit';
  customer?: Customer;
}

const inputCls =
  'mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';

export function CustomerForm({ mode, customer }: Props) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: customer?.name ?? '',
      phone: customer?.phone ?? '',
      email: customer?.email ?? '',
      address: customer?.address ?? '',
      notes: customer?.notes ?? '',
    },
  });

  const onSubmit = async (values: CustomerFormValues) => {
    const payload = {
      ...values,
      email: values.email || undefined,
      address: values.address || undefined,
      notes: values.notes || undefined,
    };

    try {
      if (mode === 'create') {
        const res = await clientFetch<{ data: Customer }>('/customers', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        router.push(`/customers/${res.data.id}`);
      } else {
        await clientFetch<{ data: Customer }>(`/customers/${customer!.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        router.push(`/customers/${customer!.id}`);
        router.refresh();
      }
    } catch (err) {
      setError('root', {
        message:
          err instanceof ApiError
            ? err.message
            : 'An unexpected error occurred. Please try again.',
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      {errors.root && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {errors.root.message}
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Name <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <input id="name" type="text" {...register('name')} className={inputCls} />
          {errors.name && (
            <p role="alert" className="mt-1.5 text-xs text-red-600">
              {errors.name.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
            Phone <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <input id="phone" type="tel" {...register('phone')} className={inputCls} />
          {errors.phone && (
            <p role="alert" className="mt-1.5 text-xs text-red-600">
              {errors.phone.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input id="email" type="email" {...register('email')} className={inputCls} />
          {errors.email && (
            <p role="alert" className="mt-1.5 text-xs text-red-600">
              {errors.email.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="address" className="block text-sm font-medium text-gray-700">
            Address
          </label>
          <input id="address" type="text" {...register('address')} className={inputCls} />
          {errors.address && (
            <p role="alert" className="mt-1.5 text-xs text-red-600">
              {errors.address.message}
            </p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
          Notes
        </label>
        <textarea id="notes" rows={3} {...register('notes')} className={inputCls} />
        {errors.notes && (
          <p role="alert" className="mt-1.5 text-xs text-red-600">
            {errors.notes.message}
          </p>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-1">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-300"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting
            ? mode === 'create'
              ? 'Creating…'
              : 'Saving…'
            : mode === 'create'
              ? 'Create customer'
              : 'Save changes'}
        </button>
      </div>
    </form>
  );
}
