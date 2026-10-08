'use client';

import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Loader2 } from 'lucide-react';
import { clientFetch, ApiError } from '@/lib/api/client';
import { deviceSchema, type DeviceFormValues } from '@/lib/validation/device';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FieldError } from './field-error';
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

export function DeviceForm({ mode, customerId, device }: Props) {
  const router = useRouter();

  const {
    register,
    control,
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
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      {errors.root && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errors.root.message}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="type">
            Device type <span className="text-destructive" aria-hidden="true">*</span>
          </Label>
          <Controller
            control={control}
            name="type"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="type" onBlur={field.onBlur} aria-invalid={!!errors.type}>
                  <SelectValue placeholder="Select a type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DEVICE_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError message={errors.type?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="brand">
            Brand <span className="text-destructive" aria-hidden="true">*</span>
          </Label>
          <Input id="brand" type="text" aria-invalid={!!errors.brand} {...register('brand')} />
          <FieldError message={errors.brand?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="model">
            Model <span className="text-destructive" aria-hidden="true">*</span>
          </Label>
          <Input id="model" type="text" aria-invalid={!!errors.model} {...register('model')} />
          <FieldError message={errors.model?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="serialNumber">Serial number</Label>
          <Input
            id="serialNumber"
            type="text"
            aria-invalid={!!errors.serialNumber}
            {...register('serialNumber')}
          />
          <FieldError message={errors.serialNumber?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="imei">IMEI</Label>
          <Input id="imei" type="text" aria-invalid={!!errors.imei} {...register('imei')} />
          <FieldError message={errors.imei?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="passcode">Passcode / PIN</Label>
          <Input
            id="passcode"
            type="password"
            autoComplete="off"
            aria-invalid={!!errors.passcode}
            {...register('passcode')}
          />
          {mode === 'edit' && device?.hasPasscode && (
            <p className="text-xs text-muted-foreground">
              A passcode is stored. Enter a new value to replace it, or leave blank to keep it.
            </p>
          )}
          <FieldError message={errors.passcode?.message} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" rows={3} aria-invalid={!!errors.notes} {...register('notes')} />
        <FieldError message={errors.notes?.message} />
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" />}
          {isSubmitting
            ? mode === 'create'
              ? 'Adding…'
              : 'Saving…'
            : mode === 'create'
              ? 'Add device'
              : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}
