'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TicketStatus } from '@repair-shop/shared';
import { clientFetch } from '@/lib/api/client';

const ALLOWED_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  [TicketStatus.RECEIVED]: [TicketStatus.DIAGNOSING, TicketStatus.CANCELLED],
  [TicketStatus.DIAGNOSING]: [
    TicketStatus.WAITING_APPROVAL,
    TicketStatus.REPAIRING,
    TicketStatus.CANCELLED,
  ],
  [TicketStatus.WAITING_APPROVAL]: [TicketStatus.APPROVED, TicketStatus.CANCELLED],
  [TicketStatus.APPROVED]: [TicketStatus.REPAIRING, TicketStatus.CANCELLED],
  [TicketStatus.REPAIRING]: [TicketStatus.READY, TicketStatus.CANCELLED],
  [TicketStatus.READY]: [TicketStatus.DELIVERED, TicketStatus.CANCELLED],
  [TicketStatus.DELIVERED]: [],
  [TicketStatus.CANCELLED]: [],
};

const STATUS_LABELS: Record<TicketStatus, string> = {
  [TicketStatus.RECEIVED]: 'Received',
  [TicketStatus.DIAGNOSING]: 'Diagnosing',
  [TicketStatus.WAITING_APPROVAL]: 'Waiting Approval',
  [TicketStatus.APPROVED]: 'Approved',
  [TicketStatus.REPAIRING]: 'Repairing',
  [TicketStatus.READY]: 'Ready',
  [TicketStatus.DELIVERED]: 'Delivered',
  [TicketStatus.CANCELLED]: 'Cancelled',
};

interface UpdateStatusFormProps {
  ticketId: string;
  currentStatus: TicketStatus;
}

export function UpdateStatusForm({ ticketId, currentStatus }: UpdateStatusFormProps) {
  const router = useRouter();
  const [status, setStatus] = useState<TicketStatus | ''>('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const options = ALLOWED_TRANSITIONS[currentStatus];

  if (options.length === 0) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!status) return;
    setLoading(true);
    setError('');
    try {
      await clientFetch(`/tickets/${ticketId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes: notes || undefined }),
      });
      router.refresh();
      setStatus('');
      setNotes('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <h2 className="text-base font-semibold text-gray-900">Update Status</h2>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-3">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as TicketStatus)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          required
        >
          <option value="">Select next status…</option>
          {options.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={loading || !status}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'Updating…' : 'Update'}
        </button>
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Optional notes…"
        rows={2}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
    </form>
  );
}
