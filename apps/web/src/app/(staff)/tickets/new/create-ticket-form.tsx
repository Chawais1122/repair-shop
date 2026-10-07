'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { clientFetch } from '@/lib/api/client';
import { createTicketSchema, type CreateTicketInput } from '@/lib/validation/ticket';
import { Priority } from '@repair-shop/shared';
import type { Customer } from '@/types/customer';
import type { Device } from '@/types/device';
import type { PaginatedResponse } from '@repair-shop/shared';

export function CreateTicketForm() {
  const router = useRouter();
  const [step, setStep] = useState<'customer' | 'device' | 'details'>('customer');
  const [customerSearch, setCustomerSearch] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
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

      {step === 'customer' && (
        <div>
          <h2 className="mb-4 text-base font-semibold text-gray-900">Step 1: Select Customer</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), searchCustomers())}
              placeholder="Search by name or phone…"
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={searchCustomers}
              disabled={loadingCustomers}
              className="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
            >
              Search
            </button>
          </div>
          {errors.customerId && (
            <p className="mt-1 text-xs text-red-600">{errors.customerId.message}</p>
          )}
          <ul className="mt-3 divide-y divide-gray-100 rounded-md border border-gray-200">
            {customers.length === 0 && customerSearch && !loadingCustomers && (
              <li className="px-4 py-3 text-sm text-gray-500">No customers found.</li>
            )}
            {customers.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => selectCustomer(c)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50"
                >
                  <p className="text-sm font-medium text-gray-900">{c.name}</p>
                  <p className="text-xs text-gray-500">{c.phone}</p>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {step === 'device' && selectedCustomer && (
        <div>
          <div className="mb-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStep('customer')}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ← Back
            </button>
            <h2 className="text-base font-semibold text-gray-900">
              Step 2: Select Device for {selectedCustomer.name}
            </h2>
          </div>
          {errors.deviceId && (
            <p className="mb-2 text-xs text-red-600">{errors.deviceId.message}</p>
          )}
          {loadingDevices ? (
            <p className="text-sm text-gray-500">Loading devices…</p>
          ) : devices.length === 0 ? (
            <p className="text-sm text-gray-500">No devices for this customer.</p>
          ) : (
            <ul className="divide-y divide-gray-100 rounded-md border border-gray-200">
              {devices.map((d) => (
                <li key={d.id}>
                  <button
                    type="button"
                    onClick={() => selectDevice(d)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50"
                  >
                    <p className="text-sm font-medium text-gray-900">
                      {d.brand} {d.model}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">{d.type.toLowerCase()}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {step === 'details' && selectedCustomer && selectedDevice && (
        <div>
          <div className="mb-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStep('device')}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ← Back
            </button>
            <h2 className="text-base font-semibold text-gray-900">Step 3: Ticket Details</h2>
          </div>

          <div className="mb-4 rounded-md bg-gray-50 px-4 py-3 text-sm">
            <p>
              <span className="text-gray-500">Customer:</span>{' '}
              <span className="font-medium">{selectedCustomer.name}</span>
            </p>
            <p>
              <span className="text-gray-500">Device:</span>{' '}
              <span className="font-medium">
                {selectedDevice.brand} {selectedDevice.model}
              </span>
            </p>
          </div>

          {serverError && <p className="mb-3 text-sm text-red-600">{serverError}</p>}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Priority</label>
              <select
                {...register('priority')}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {Object.values(Priority).map((p) => (
                  <option key={p} value={p}>
                    {p.charAt(0) + p.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Problem Description <span className="text-red-500">*</span>
              </label>
              <textarea
                {...register('reportedProblem')}
                rows={4}
                placeholder="Describe the problem the customer reported…"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              {errors.reportedProblem && (
                <p className="mt-1 text-xs text-red-600">{errors.reportedProblem.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Expected Completion (optional)
              </label>
              <input
                type="date"
                {...register('expectedCompletionAt')}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-md bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Creating…' : 'Create Ticket'}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
