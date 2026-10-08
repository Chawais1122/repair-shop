'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Loader2 } from 'lucide-react';
import { ApiError, clientFetch } from '@/lib/api/client';
import { toDateParam } from '@/lib/format';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function RequestTimeOffForm() {
  const router = useRouter();
  const today = toDateParam(new Date());
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSent(false);
    if (!startDate || !endDate) {
      setError('Choose the first and last day off');
      return;
    }
    if (endDate < startDate) {
      setError('The last day must be on or after the first day');
      return;
    }
    setPending(true);
    setError('');
    try {
      await clientFetch('/time-off', {
        method: 'POST',
        body: JSON.stringify({ startDate, endDate, reason: reason || undefined }),
      });
      setStartDate('');
      setEndDate('');
      setReason('');
      setSent(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Request failed');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {sent && <p className="text-sm text-green-700">Request sent for approval.</p>}
      <div className="space-y-2">
        <Label htmlFor="off-start">First day off</Label>
        <Input
          id="off-start"
          type="date"
          min={today}
          value={startDate}
          onChange={(e) => {
            setStartDate(e.target.value);
            if (!endDate || endDate < e.target.value) setEndDate(e.target.value);
          }}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="off-end">Last day off</Label>
        <Input
          id="off-end"
          type="date"
          min={startDate || today}
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="off-reason">Reason (optional)</Label>
        <Input
          id="off-reason"
          maxLength={300}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending && <Loader2 className="animate-spin" />}
        Send request
      </Button>
    </form>
  );
}
