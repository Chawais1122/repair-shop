'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, Loader2, LogIn, LogOut } from 'lucide-react';
import { clientFetch } from '@/lib/api/client';
import { formatMinutes } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { ClockStatus } from '@/types/team';

const QUERY_KEY = ['time-clock', 'me'];

function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

export function ClockWidget() {
  const queryClient = useQueryClient();
  const now = useNow(30_000);

  const { data: status, isPending, isError } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => clientFetch<{ data: ClockStatus }>('/time-clock/me').then((r) => r.data),
    refetchInterval: 5 * 60_000,
  });

  const mutation = useMutation({
    mutationFn: (action: 'clock-in' | 'clock-out') =>
      clientFetch<{ data: ClockStatus }>(`/time-clock/${action}`, {
        method: 'POST',
        body: JSON.stringify({}),
      }).then((r) => r.data),
    onSuccess: (next) => queryClient.setQueryData(QUERY_KEY, next),
  });

  if (isPending) {
    return (
      <div className="flex h-[74px] items-center justify-center rounded-lg border bg-background">
        <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="Loading clock" />
      </div>
    );
  }
  if (isError || !status) return null;

  const shiftMinutes = status.openEntry
    ? Math.max(0, Math.round((now - new Date(status.openEntry.clockIn).getTime()) / 60_000))
    : 0;

  return (
    <div className="space-y-2 rounded-lg border bg-background p-3">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="flex items-center gap-1.5 font-medium">
          <span
            className={cn(
              'size-2 rounded-full',
              status.clockedIn ? 'bg-green-500' : 'bg-muted-foreground/40',
            )}
            aria-hidden="true"
          />
          {status.clockedIn ? `On shift · ${formatMinutes(shiftMinutes)}` : 'Off the clock'}
        </span>
        <span className="flex items-center gap-1 text-muted-foreground" title="Hours this week">
          <Clock className="size-3" aria-hidden="true" />
          {formatMinutes(status.weekMinutes)}
        </span>
      </div>
      <Button
        size="sm"
        variant={status.clockedIn ? 'outline' : 'default'}
        className="w-full"
        disabled={mutation.isPending}
        onClick={() => mutation.mutate(status.clockedIn ? 'clock-out' : 'clock-in')}
      >
        {mutation.isPending ? (
          <Loader2 className="animate-spin" />
        ) : status.clockedIn ? (
          <LogOut />
        ) : (
          <LogIn />
        )}
        {status.clockedIn ? 'Clock out' : 'Clock in'}
      </Button>
      {mutation.isError && (
        <p role="alert" className="text-xs text-destructive">
          {mutation.error.message}
        </p>
      )}
    </div>
  );
}
