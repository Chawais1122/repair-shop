'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { clientFetch } from '@/lib/api/client';
import type { Technician } from '@/types/ticket';

interface Props {
  ticketId: string;
  currentAssignedId: string | null;
  technicians: Technician[];
}

export function AssignTechnicianForm({ ticketId, currentAssignedId, technicians }: Props) {
  const router = useRouter();
  const [assignedToId, setAssignedToId] = useState(currentAssignedId ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await clientFetch(`/tickets/${ticketId}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedToId: assignedToId || undefined }),
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign technician');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
        Technician
      </h2>

      {error && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="assign-technician" className="block text-sm font-medium text-gray-700">
          Assigned to
        </label>
        <select
          id="assign-technician"
          value={assignedToId}
          onChange={(e) => setAssignedToId(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">Unassigned</option>
          {technicians.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="inline-flex w-full items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? 'Saving…' : 'Save assignment'}
      </button>
    </form>
  );
}
