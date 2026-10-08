'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Loader2 } from 'lucide-react';
import { TicketStatus } from '@repair-shop/shared';
import { clientFetch } from '@/lib/api/client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

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
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Update Status</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="next-status">Move to</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as TicketStatus)}>
              <SelectTrigger id="next-status">
                <SelectValue placeholder="Select next status…" />
              </SelectTrigger>
              <SelectContent>
                {options.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status-notes">
              Notes <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="status-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add a note about this status change…"
              rows={2}
            />
          </div>

          <Button type="submit" disabled={loading || !status} className="w-full">
            {loading && <Loader2 className="animate-spin" />}
            {loading ? 'Updating…' : 'Update status'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
