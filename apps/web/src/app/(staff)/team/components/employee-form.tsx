'use client';

import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Loader2 } from 'lucide-react';
import { UserRole } from '@repair-shop/shared';
import { ApiError, clientFetch } from '@/lib/api/client';
import { employeeSchema, passwordSchema, type EmployeeFormValues } from '@/lib/validation/team';
import { FieldError } from '@/components/shared/field-error';
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
import type { StaffUser } from '@/types/team';
import { ROLE_LABELS } from './role-badge';

interface Props {
  mode: 'create' | 'edit';
  employee?: StaffUser;
}

export function EmployeeForm({ mode, employee }: Props) {
  const router = useRouter();
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      name: employee?.name ?? '',
      email: employee?.email ?? '',
      role: employee?.role ?? UserRole.TECHNICIAN,
      phone: employee?.phone ?? '',
      hourlyRate: employee?.hourlyRate ? Number(employee.hourlyRate) : undefined,
      monthlySalesTarget: employee?.monthlySalesTarget
        ? Number(employee.monthlySalesTarget)
        : undefined,
      password: '',
    },
  });

  const onSubmit = async (values: EmployeeFormValues) => {
    if (mode === 'create') {
      const check = passwordSchema.safeParse(values.password);
      if (!check.success) {
        setError('password', { message: check.error.issues[0]?.message });
        return;
      }
    }

    try {
      if (mode === 'create') {
        await clientFetch('/users', {
          method: 'POST',
          body: JSON.stringify({
            name: values.name,
            email: values.email,
            role: values.role,
            password: values.password,
            phone: values.phone || undefined,
            hourlyRate: values.hourlyRate,
            monthlySalesTarget: values.monthlySalesTarget,
          }),
        });
      } else {
        await clientFetch(`/users/${employee!.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: values.name,
            role: values.role,
            phone: values.phone || null,
            hourlyRate: values.hourlyRate ?? null,
            monthlySalesTarget: values.monthlySalesTarget ?? null,
          }),
        });
      }
      router.push('/team');
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
          <Label htmlFor="name">Full name</Label>
          <Input id="name" aria-invalid={!!errors.name} {...register('name')} />
          <FieldError message={errors.name?.message} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            disabled={mode === 'edit'}
            aria-invalid={!!errors.email}
            {...register('email')}
          />
          <FieldError message={errors.email?.message} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="role">Role</Label>
          <Controller
            control={control}
            name="role"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="role" onBlur={field.onBlur}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(UserRole).map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <p className="text-xs text-muted-foreground">
            Admins manage staff, inventory and voids. Front desk handles sales and tickets.
            Technicians work on repairs.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" type="tel" aria-invalid={!!errors.phone} {...register('phone')} />
          <FieldError message={errors.phone?.message} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="hourlyRate">Hourly rate ($)</Label>
          <Input
            id="hourlyRate"
            type="number"
            step="0.01"
            min="0"
            aria-invalid={!!errors.hourlyRate}
            {...register('hourlyRate', { valueAsNumber: true })}
          />
          <FieldError message={errors.hourlyRate?.message} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="monthlySalesTarget">Monthly sales target ($)</Label>
          <Input
            id="monthlySalesTarget"
            type="number"
            step="0.01"
            min="0"
            aria-invalid={!!errors.monthlySalesTarget}
            {...register('monthlySalesTarget', { valueAsNumber: true })}
          />
          <FieldError message={errors.monthlySalesTarget?.message} />
        </div>
        {mode === 'create' && (
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="password">Temporary password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              aria-invalid={!!errors.password}
              {...register('password')}
            />
            <p className="text-xs text-muted-foreground">
              At least 8 characters. Share it with the employee securely.
            </p>
            <FieldError message={errors.password?.message} />
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" />}
          {mode === 'create' ? 'Create employee' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}
