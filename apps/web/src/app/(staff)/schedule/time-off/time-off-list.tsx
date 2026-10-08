'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2, X } from 'lucide-react';
import { TimeOffStatus } from '@repair-shop/shared';
import { ApiError, clientFetch } from '@/lib/api/client';
import { toDateParam } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { TimeOffRequest } from '@/types/schedule';

const STATUS_STYLES: Record<TimeOffStatus, string> = {
  [TimeOffStatus.PENDING]: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
  [TimeOffStatus.APPROVED]: 'bg-green-100 text-green-700 hover:bg-green-100',
  [TimeOffStatus.DENIED]: 'bg-red-100 text-red-700 hover:bg-red-100',
  [TimeOffStatus.CANCELLED]: 'bg-zinc-100 text-zinc-600 hover:bg-zinc-100',
};

const STATUS_LABELS: Record<TimeOffStatus, string> = {
  [TimeOffStatus.PENDING]: 'Pending',
  [TimeOffStatus.APPROVED]: 'Approved',
  [TimeOffStatus.DENIED]: 'Denied',
  [TimeOffStatus.CANCELLED]: 'Cancelled',
};

function dateRange(start: string, end: string): string {
  const fmt = (k: string) =>
    new Date(`${k}T00:00:00`).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  return start === end ? fmt(start) : `${fmt(start)} – ${fmt(end)}`;
}

interface Props {
  requests: TimeOffRequest[];
  mode: 'own' | 'review' | 'history';
  viewerId: string;
}

export function TimeOffList({ requests, mode }: Props) {
  return (
    <ul className="divide-y">
      {requests.map((r) => (
        <TimeOffRow key={r.id} request={r} mode={mode} />
      ))}
    </ul>
  );
}

function TimeOffRow({ request: r, mode }: { request: TimeOffRequest; mode: Props['mode'] }) {
  const router = useRouter();
  const [note, setNote] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const today = toDateParam(new Date());
  const canCancel =
    mode === 'own' &&
    (r.status === TimeOffStatus.PENDING ||
      (r.status === TimeOffStatus.APPROVED && r.startDate > today));

  async function act(key: string, path: string, init: RequestInit) {
    setPending(key);
    setMessage('');
    try {
      const res = await clientFetch<{ data: TimeOffRequest }>(path, init);
      if (res.data.conflictingShifts) {
        setMessage(
          `Approved. ${res.data.conflictingShifts} planned shift${
            res.data.conflictingShifts === 1 ? '' : 's'
          } now need cover.`,
        );
      }
      router.refresh();
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : 'Action failed');
    } finally {
      setPending(null);
    }
  }

  const review = (status: TimeOffStatus.APPROVED | TimeOffStatus.DENIED) =>
    act(status, `/time-off/${r.id}/review`, {
      method: 'PATCH',
      body: JSON.stringify({ status, note: note || undefined }),
    });

  return (
    <li className="space-y-2 py-3 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          {mode !== 'own' && <p className="text-sm font-semibold">{r.user.name}</p>}
          <p className="text-sm">
            {dateRange(r.startDate, r.endDate)}{' '}
            <span className="text-muted-foreground">
              · {r.days} day{r.days === 1 ? '' : 's'}
            </span>
          </p>
          {r.reason && <p className="text-sm text-muted-foreground">{r.reason}</p>}
          {r.reviewedBy && (
            <p className="text-xs text-muted-foreground">
              {STATUS_LABELS[r.status]} by {r.reviewedBy.name}
              {r.reviewNote && ` — “${r.reviewNote}”`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className={cn('font-medium shadow-none', STATUS_STYLES[r.status])}>
            {STATUS_LABELS[r.status]}
          </Badge>
          {canCancel && (
            <Button
              variant="ghost"
              size="sm"
              disabled={pending !== null}
              onClick={() => act('cancel', `/time-off/${r.id}/cancel`, { method: 'POST' })}
            >
              {pending === 'cancel' && <Loader2 className="animate-spin" />}
              Cancel
            </Button>
          )}
        </div>
      </div>

      {mode === 'review' && (
        <div className="flex flex-wrap items-center gap-2">
          <Input
            aria-label={`Note for ${r.user.name}`}
            placeholder="Note (optional)"
            className="h-8 max-w-xs"
            maxLength={300}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <Button size="sm" disabled={pending !== null} onClick={() => review(TimeOffStatus.APPROVED)}>
            {pending === TimeOffStatus.APPROVED ? <Loader2 className="animate-spin" /> : <Check />}
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={pending !== null}
            onClick={() => review(TimeOffStatus.DENIED)}
          >
            {pending === TimeOffStatus.DENIED ? <Loader2 className="animate-spin" /> : <X />}
            Deny
          </Button>
        </div>
      )}
      {message && <p className="text-xs text-muted-foreground">{message}</p>}
    </li>
  );
}
