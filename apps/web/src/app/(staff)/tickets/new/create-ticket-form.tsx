'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { clientFetch } from '@/lib/api/client';
import { createTicketSchema, type CreateTicketInput } from '@/lib/validation/ticket';
import { Priority } from '@repair-shop/shared';
import type { Customer } from '@/types/customer';
import type { Device } from '@/types/device';
import type { PaginatedResponse } from '@repair-shop/shared';

const inputCls =
  'mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';

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
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateTicketInput>({
    resolver: zodResolver(createTicketSchema),
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
        body: JSON.stringify(data),
      });
      router.push(`/tickets/${res.data.id}`);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Failed to create ticket');
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <input type="hidden" {...register('customerId')} />
      <input type="hidden" {...register('deviceId')} />

      {/* Step indicator */}
      <ol className="flex items-center gap-4 text-sm" aria-label="Form steps">
        {(['customer', 'device', 'details'] as const).map((s, i) => {
          const labels = { customer: 'Customer', device: 'Device', details: 'Details' };
          const done = (step === 'device' && s === 'customer') ||
            (step === 'details' && (s === 'customer' || s === 'device'));
          const active = step === s;
          return (
            <li key={s} className="flex items-center gap-2">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                  done
                    ? 'bg-indigo-600 text-white'
                    : active
                      ? 'border-2 border-indigo-600 text-indigo-600'
                      : 'border border-gray-300 text-gray-400'
                }`}
              >
                {done ? '✓' : i + 1}
              </span>
              <span
                className={`font-medium ${active ? 'text-gray-900' : done ? 'text-gray-500' : 'text-gray-400'}`}
              >
                {labels[s]}
              </span>
              {i < 2 && <span className="text-gray-300" aria-hidden="true">—</span>}
            </li>
          );
        })}
      </ol>

      {/* Step 1: Customer */}
      {step === 'customer' && (
        <div>
          <h2 className="mb-4 text-base font-semibold text-gray-900">Select customer</h2>
          <div className="flex gap-2">
            <label htmlFor="customer-search" className="sr-only">
              Search customers
            </label>
            <input
              id="customer-search"
              type="text"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), searchCustomers())}
              placeholder="Search by name or phone…"
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={searchCustomers}
              disabled={loadingCustomers}
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loadingCustomers ? 'Searching…' : 'Search'}
            </button>
          </div>
          {errors.customerId && (
            <p role="alert" className="mt-1.5 text-xs text-red-600">
              {errors.customerId.message}
            </p>
          )}

          {searchPerformed && (
            <div className="mt-3 overflow-hidden rounded-md border border-gray-200">
              {customers.length === 0 && !loadingCustomers ? (
                <div className="p-6 text-center">
                  <p className="text-sm text-gray-500">No customers found for &quot;{customerSearch}&quot;.</p>
                  <Link
                    href="/customers/new"
                    className="mt-1.5 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-500"
                  >
                    Add a new customer →
                  </Link>
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {customers.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => selectCustomer(c)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 focus-visible:bg-gray-50 focus-visible:outline-none"
                      >
                        <p className="text-sm font-medium text-gray-900">{c.name}</p>
                        <p className="text-xs text-gray-500">{c.phone}</p>
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
        <div>
          <div className="mb-4 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setStep('customer')}
              className="text-sm text-indigo-600 hover:text-indigo-800"
            >
              ← Back
            </button>
            <h2 className="text-base font-semibold text-gray-900">
              Select device for {selectedCustomer.name}
            </h2>
          </div>
          {errors.deviceId && (
            <p role="alert" className="mb-2 text-xs text-red-600">
              {errors.deviceId.message}
            </p>
          )}
          {loadingDevices ? (
            <div className="space-y-2 rounded-md border border-gray-200 p-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded bg-gray-100" />
              ))}
            </div>
          ) : devices.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-gray-200 p-8 text-center">
              <p className="text-sm text-gray-500">No devices on record for this customer.</p>
              <Link
                href={`/customers/${selectedCustomer.id}/devices/new`}
                className="mt-2 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-500"
              >
                Add a device →
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 overflow-hidden rounded-md border border-gray-200">
              {devices.map((d) => (
                <li key={d.id}>
                  <button
                    type="button"
                    onClick={() => selectDevice(d)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 focus-visible:bg-gray-50 focus-visible:outline-none"
                  >
                    <p className="text-sm font-medium text-gray-900">
                      {d.brand} {d.model}
                    </p>
                    <p className="text-xs capitalize text-gray-500">{d.type.toLowerCase()}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Step 3: Details */}
      {step === 'details' && selectedCustomer && selectedDevice && (
        <div>
          <div className="mb-4 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setStep('device')}
              className="text-sm text-indigo-600 hover:text-indigo-800"
            >
              ← Back
            </button>
            <h2 className="text-base font-semibold text-gray-900">Ticket details</h2>
          </div>

          <div className="mb-5 rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
            <div className="flex items-center gap-1">
              <span className="text-gray-500">Customer:</span>
              <span className="font-medium text-gray-900">{selectedCustomer.name}</span>
            </div>
            <div className="mt-1 flex items-center gap-1">
              <span className="text-gray-500">Device:</span>
              <span className="font-medium text-gray-900">
                {selectedDevice.brand} {selectedDevice.model}
              </span>
            </div>
          </div>

          {serverError && (
            <div role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {serverError}
            </div>
          )}

          <div className="space-y-5">
            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
                Priority
              </label>
              <select id="priority" {...register('priority')} className={inputCls}>
                {Object.values(Priority).map((p) => (
                  <option key={p} value={p}>
                    {p.charAt(0) + p.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="reportedProblem" className="block text-sm font-medium text-gray-700">
                Problem description <span className="text-red-500" aria-hidden="true">*</span>
              </label>
              <textarea
                id="reportedProblem"
                {...register('reportedProblem')}
                rows={4}
                placeholder="Describe the problem the customer reported…"
                className={inputCls}
              />
              {errors.reportedProblem && (
                <p role="alert" className="mt-1.5 text-xs text-red-600">
                  {errors.reportedProblem.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="expectedCompletionAt" className="block text-sm font-medium text-gray-700">
                Expected completion <span className="text-gray-400">(optional)</span>
              </label>
              <input
                id="expectedCompletionAt"
                type="date"
                {...register('expectedCompletionAt')}
                className={inputCls}
              />
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => setStep('device')}
                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? 'Creating…' : 'Create ticket'}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
