'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, Check, ChevronRight, Loader2 } from 'lucide-react';
import { clientFetch } from '@/lib/api/client';
import { createTicketSchema, type CreateTicketInput } from '@/lib/validation/ticket';
import { Priority } from '@repair-shop/shared';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { FieldError } from '@/components/shared/field-error';
import { cn } from '@/lib/utils';
import type { Customer } from '@/types/customer';
import type { Device } from '@/types/device';
import type { PaginatedResponse } from '@repair-shop/shared';

const STEPS = ['customer', 'device', 'details'] as const;
const STEP_LABELS = { customer: 'Customer', device: 'Device', details: 'Details' };

export function CreateTicketForm() {
  const router = useRouter();
  const [step, setStep] = useState<'customer' | 'device' | 'details'>('customer');
  const [customerSearch, setCustomerSearch] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateTicketInput>({
    resolver: zodResolver(createTicketSchema),
    // Matches the API's default priority
    defaultValues: { priority: Priority.NORMAL },
  });

  async function searchCustomers() {
    if (!customerSearch.trim()) return;
    setLoadingCustomers(true);
    setSearchPerformed(true);
    try {
      const res = await clientFetch<PaginatedResponse<Customer>>(
        `/customers?search=${encodeURIComponent(customerSearch)}&limit=10`,
      );
      setCustomers(res.data);
    } finally {
      setLoadingCustomers(false);
    }
  }

  async function selectCustomer(c: Customer) {
    setSelectedCustomer(c);
    setValue('customerId', c.id);
    setLoadingDevices(true);
    try {
      const res = await clientFetch<PaginatedResponse<Device>>(
        `/customers/${c.id}/devices?limit=100`,
      );
      setDevices(res.data);
    } finally {
      setLoadingDevices(false);
    }
    setStep('device');
  }

  function selectDevice(d: Device) {
    setSelectedDevice(d);
    setValue('deviceId', d.id);
    setStep('details');
  }

  async function onSubmit(data: CreateTicketInput) {
    setServerError('');
    try {
      const res = await clientFetch<{ data: { id: string } }>('/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Empty date input yields '' which the API's IsDateString rejects
        body: JSON.stringify({
          ...data,
          expectedCompletionAt: data.expectedCompletionAt || undefined,
        }),
      });
      router.push(`/tickets/${res.data.id}`);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Failed to create ticket');
    }
  }

  const currentIndex = STEPS.indexOf(step);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <input type="hidden" {...register('customerId')} />
      <input type="hidden" {...register('deviceId')} />

      {/* Step indicator */}
      <ol className="flex items-center gap-2 text-sm" aria-label="Form steps">
        {STEPS.map((s, i) => {
          const done = i < currentIndex;
          const active = i === currentIndex;
          return (
            <li key={s} className="flex items-center gap-2">
              <span
                className={cn(
                  'flex size-6 items-center justify-center rounded-full text-xs font-semibold',
                  done && 'bg-primary text-primary-foreground',
                  active && 'border-2 border-primary text-primary',
                  !done && !active && 'border text-muted-foreground',
                )}
              >
                {done ? <Check className="size-3.5" aria-hidden="true" /> : i + 1}
              </span>
              <span
                className={cn(
                  'font-medium',
                  active ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {STEP_LABELS[s]}
              </span>
              {i < STEPS.length - 1 && (
                <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
              )}
            </li>
          );
        })}
      </ol>

      {/* Step 1: Customer */}
      {step === 'customer' && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold">Select customer</h2>
          <div className="flex gap-2">
            <label htmlFor="customer-search" className="sr-only">
              Search customers
            </label>
            <Input
              id="customer-search"
              type="text"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), searchCustomers())}
              placeholder="Search by name or phone…"
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              onClick={searchCustomers}
              disabled={loadingCustomers}
            >
              {loadingCustomers && <Loader2 className="animate-spin" />}
              {loadingCustomers ? 'Searching…' : 'Search'}
            </Button>
          </div>
          <FieldError message={errors.customerId?.message} />

          {searchPerformed && (
            <div className="overflow-hidden rounded-md border">
              {customers.length === 0 && !loadingCustomers ? (
                <div className="p-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    No customers found for &quot;{customerSearch}&quot;.
                  </p>
                  <Button asChild variant="link" size="sm">
                    <Link href="/customers/new">Add a new customer →</Link>
                  </Button>
                </div>
              ) : (
                <ul className="divide-y">
                  {customers.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => selectCustomer(c)}
                        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                      >
                        <span>
                          <span className="block text-sm font-medium">{c.name}</span>
                          <span className="block text-xs text-muted-foreground">{c.phone}</span>
                        </span>
                        <ChevronRight
                          className="size-4 text-muted-foreground"
                          aria-hidden="true"
                        />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Device */}
      {step === 'device' && selectedCustomer && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setStep('customer')}
            >
              <ArrowLeft />
              Back
            </Button>
            <h2 className="text-base font-semibold">
              Select device for {selectedCustomer.name}
            </h2>
          </div>
          <FieldError message={errors.deviceId?.message} />
          {loadingDevices ? (
            <div className="space-y-2 rounded-md border p-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : devices.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="text-sm text-muted-foreground">
                No devices on record for this customer.
              </p>
              <Button asChild variant="link" size="sm">
                <Link href={`/customers/${selectedCustomer.id}/devices/new`}>
                  Add a device →
                </Link>
              </Button>
            </div>
          ) : (
            <ul className="divide-y overflow-hidden rounded-md border">
              {devices.map((d) => (
                <li key={d.id}>
                  <button
                    type="button"
                    onClick={() => selectDevice(d)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                  >
                    <span>
                      <span className="block text-sm font-medium">
                        {d.brand} {d.model}
                      </span>
                      <span className="block text-xs capitalize text-muted-foreground">
                        {d.type.toLowerCase()}
                      </span>
                    </span>
                    <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Step 3: Details */}
      {step === 'details' && selectedCustomer && selectedDevice && (
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setStep('device')}>
              <ArrowLeft />
              Back
            </Button>
            <h2 className="text-base font-semibold">Ticket details</h2>
          </div>

          <div className="rounded-md border bg-muted/50 px-4 py-3 text-sm">
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Customer:</span>
              <span className="font-medium">{selectedCustomer.name}</span>
            </div>
            <div className="mt-1 flex items-center gap-1">
              <span className="text-muted-foreground">Device:</span>
              <span className="font-medium">
                {selectedDevice.brand} {selectedDevice.model}
              </span>
            </div>
          </div>

          {(errors.customerId || errors.deviceId) && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {errors.customerId?.message ?? errors.deviceId?.message}
              </AlertDescription>
            </Alert>
          )}

          {serverError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Controller
              control={control}
              name="priority"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="priority" onBlur={field.onBlur}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(Priority).map((p) => (
                      <SelectItem key={p} value={p}>
                        {p.charAt(0) + p.slice(1).toLowerCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reportedProblem">
              Problem description{' '}
              <span className="text-destructive" aria-hidden="true">
                *
              </span>
            </Label>
            <Textarea
              id="reportedProblem"
              {...register('reportedProblem')}
              rows={4}
              placeholder="Describe the problem the customer reported…"
              aria-invalid={!!errors.reportedProblem}
            />
            <FieldError message={errors.reportedProblem?.message} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expectedCompletionAt">
              Expected completion <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="expectedCompletionAt"
              type="date"
              {...register('expectedCompletionAt')}
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setStep('device')}>
              Back
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin" />}
              {isSubmitting ? 'Creating…' : 'Create ticket'}
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}
