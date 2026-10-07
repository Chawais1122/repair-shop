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
  [TicketStatus.READY]: 'Ready for Pickup',
  [TicketStatus.DELIVERED]: 'Delivered',
  [TicketStatus.CANCELLED]: 'Cancelled',
};

interface Props {
  ticketId: string;
  currentStatus: TicketStatus;
}

export function UpdateStatusForm({ ticketId, currentStatus }: Props) {
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
        Update Status
      </h2>

      {error && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="next-status" className="block text-sm font-medium text-gray-700">
          Move to
        </label>
        <select
          id="next-status"
          value={status}
          onChange={(e) => setStatus(e.target.value as TicketStatus)}
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">Select next status…</option>
          {options.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="status-notes" className="block text-sm font-medium text-gray-700">
          Notes <span className="text-gray-400">(optional)</span>
        </label>
        <textarea
          id="status-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add a note about this status change…"
          rows={2}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <button
        type="submit"
        disabled={loading || !status}
        className="inline-flex w-full items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? 'Updating…' : 'Update status'}
      </button>
    </form>
  );
}
