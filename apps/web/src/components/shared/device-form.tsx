'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { clientFetch, ApiError } from '@/lib/api/client';
import { deviceSchema, type DeviceFormValues } from '@/lib/validation/device';
import type { Device } from '@/types/device';

const DEVICE_TYPE_LABELS: Record<string, string> = {
  PHONE: 'Phone',
  TABLET: 'Tablet',
  LAPTOP: 'Laptop',
  DESKTOP: 'Desktop',
  WATCH: 'Watch',
  OTHER: 'Other',
};

interface Props {
  mode: 'create' | 'edit';
  customerId: string;
  device?: Device;
}

const inputCls =
  'mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';

export function DeviceForm({ mode, customerId, device }: Props) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<DeviceFormValues>({
    resolver: zodResolver(deviceSchema),
    defaultValues: {
      type: device?.type ?? 'PHONE',
      brand: device?.brand ?? '',
      model: device?.model ?? '',
      serialNumber: device?.serialNumber ?? '',
      imei: device?.imei ?? '',
      passcode: '',
      notes: device?.notes ?? '',
    },
  });

  const onSubmit = async (values: DeviceFormValues) => {
    const payload = {
      ...values,
      serialNumber: values.serialNumber || undefined,
      imei: values.imei || undefined,
      passcode: values.passcode || undefined,
      notes: values.notes || undefined,
    };

    try {
      if (mode === 'create') {
        await clientFetch<{ data: Device }>(`/customers/${customerId}/devices`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        router.push(`/customers/${customerId}`);
        router.refresh();
      } else {
        await clientFetch<{ data: Device }>(`/devices/${device!.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        router.push(`/customers/${customerId}/devices/${device!.id}`);
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
          <label htmlFor="type" className="block text-sm font-medium text-gray-700">
            Device type <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <select id="type" {...register('type')} className={inputCls}>
            {Object.entries(DEVICE_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {errors.type && (
            <p role="alert" className="mt-1.5 text-xs text-red-600">
              {errors.type.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="brand" className="block text-sm font-medium text-gray-700">
            Brand <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <input id="brand" type="text" {...register('brand')} className={inputCls} />
          {errors.brand && (
            <p role="alert" className="mt-1.5 text-xs text-red-600">
              {errors.brand.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="model" className="block text-sm font-medium text-gray-700">
            Model <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <input id="model" type="text" {...register('model')} className={inputCls} />
          {errors.model && (
            <p role="alert" className="mt-1.5 text-xs text-red-600">
              {errors.model.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="serialNumber" className="block text-sm font-medium text-gray-700">
            Serial number
          </label>
          <input id="serialNumber" type="text" {...register('serialNumber')} className={inputCls} />
          {errors.serialNumber && (
            <p role="alert" className="mt-1.5 text-xs text-red-600">
              {errors.serialNumber.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="imei" className="block text-sm font-medium text-gray-700">
            IMEI
          </label>
          <input id="imei" type="text" {...register('imei')} className={inputCls} />
          {errors.imei && (
            <p role="alert" className="mt-1.5 text-xs text-red-600">
              {errors.imei.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="passcode" className="block text-sm font-medium text-gray-700">
            Passcode / PIN
          </label>
          <input
            id="passcode"
            type="password"
            autoComplete="off"
            {...register('passcode')}
            className={inputCls}
          />
          {mode === 'edit' && device?.hasPasscode && (
            <p className="mt-1.5 text-xs text-gray-500">
              A passcode is stored. Enter a new value to replace it, or leave blank to keep it.
            </p>
          )}
          {errors.passcode && (
            <p role="alert" className="mt-1.5 text-xs text-red-600">
              {errors.passcode.message}
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
              ? 'Adding…'
              : 'Saving…'
            : mode === 'create'
              ? 'Add device'
              : 'Save changes'}
        </button>
      </div>
    </form>
  );
}
