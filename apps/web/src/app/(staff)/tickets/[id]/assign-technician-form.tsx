'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { clientFetch } from '@/lib/api/client';
import type { Technician } from '@/types/ticket';

interface AssignTechnicianFormProps {
  ticketId: string;
  currentAssignedId: string | null;
  technicians: Technician[];
}

export function AssignTechnicianForm({
  ticketId,
  currentAssignedId,
  technicians,
}: AssignTechnicianFormProps) {
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
    <form onSubmit={handleSubmit} className="space-y-3">
      <h2 className="text-base font-semibold text-gray-900">Assign Technician</h2>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-3">
        <select
          value={assignedToId}
          onChange={(e) => setAssignedToId(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">Unassigned</option>
          {technicians.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
        >
          {loading ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  );
}
