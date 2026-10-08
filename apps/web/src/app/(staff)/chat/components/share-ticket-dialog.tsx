'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Search, Ticket } from 'lucide-react';
import type { PaginatedResponse } from '@repair-shop/shared';
import { clientFetch } from '@/lib/api/client';
import { TicketStatusBadge } from '@/components/shared/ticket-status-badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { Ticket as TicketType } from '@/types/ticket';

interface Props {
  disabled?: boolean;
  onShare: (ticketId: string) => Promise<boolean>;
}

export function ShareTicketDialog({ disabled, onShare }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isFetching } = useQuery({
    queryKey: ['tickets', 'share', debounced],
    queryFn: () =>
      clientFetch<PaginatedResponse<TicketType>>(
        `/tickets?limit=8${debounced ? `&search=${encodeURIComponent(debounced)}` : ''}`,
      ),
    enabled: open,
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSearch('');
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="icon" aria-label="Share a ticket" disabled={disabled}>
          <Ticket />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share a ticket</DialogTitle>
          <DialogDescription>Post a live link to a repair ticket in this channel.</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            autoFocus
            aria-label="Search tickets"
            placeholder="Ticket # or customer…"
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {isFetching && (
            <Loader2
              className="absolute right-2.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
              aria-hidden="true"
            />
          )}
        </div>
        <ul className="max-h-72 divide-y overflow-y-auto rounded-md border">
          {(data?.data ?? []).map((t) => (
            <li key={t.id}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                onClick={async () => {
                  if (await onShare(t.id)) setOpen(false);
                }}
              >
                <span>
                  <span className="block text-sm font-medium">{t.ticketNumber}</span>
                  <span className="block text-xs text-muted-foreground">
                    {t.customer.name} · {t.device.brand} {t.device.model}
                  </span>
                </span>
                <TicketStatusBadge status={t.status} />
              </button>
            </li>
          ))}
          {data && data.data.length === 0 && (
            <li className="p-6 text-center text-sm text-muted-foreground">No tickets found.</li>
          )}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
