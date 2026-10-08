'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Package, Search } from 'lucide-react';
import type { PaginatedResponse } from '@repair-shop/shared';
import { clientFetch } from '@/lib/api/client';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
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
import type { Part } from '@/types/inventory';

interface Props {
  onSelect: (part: Part) => void;
  trigger: React.ReactNode;
  title?: string;
  /** Hide parts already chosen elsewhere in the form. */
  excludeIds?: string[];
  /** Disallow parts with no stock (e.g. when consuming stock rather than ordering it). */
  requireStock?: boolean;
}

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

export function PartPickerDialog({
  onSelect,
  trigger,
  title = 'Select a part',
  excludeIds = [],
  requireStock = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const debounced = useDebounced(search.trim(), 250);

  const { data, isFetching, isError } = useQuery({
    queryKey: ['parts', 'picker', debounced],
    queryFn: () =>
      clientFetch<PaginatedResponse<Part>>(
        `/parts?limit=15${debounced ? `&search=${encodeURIComponent(debounced)}` : ''}`,
      ),
    enabled: open,
    staleTime: 15_000,
  });

  const parts = (data?.data ?? []).filter((p) => !excludeIds.includes(p.id));

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSearch('');
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Search by name, SKU or category.</DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search parts…"
            className="pl-8"
            aria-label="Search parts"
          />
          {isFetching && (
            <Loader2
              className="absolute right-2.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
              aria-hidden="true"
            />
          )}
        </div>

        <div className="max-h-80 overflow-y-auto rounded-md border">
          {isError ? (
            <p className="p-6 text-center text-sm text-destructive">Failed to load parts.</p>
          ) : parts.length === 0 && !isFetching ? (
            <div className="flex flex-col items-center gap-2 p-8 text-center">
              <Package className="size-6 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">No parts found.</p>
            </div>
          ) : (
            <ul className="divide-y">
              {parts.map((part) => {
                const unavailable = requireStock && part.quantity <= 0;
                return (
                  <li key={part.id}>
                    <button
                      type="button"
                      disabled={unavailable}
                      onClick={() => {
                        onSelect(part);
                        setOpen(false);
                        setSearch('');
                      }}
                      className={cn(
                        'flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
                      )}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{part.name}</span>
                        <span className="block font-mono text-xs text-muted-foreground">
                          {part.sku}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block text-sm font-medium">
                          {formatCurrency(part.sellPrice)}
                        </span>
                        <span
                          className={cn(
                            'block text-xs',
                            part.quantity <= 0
                              ? 'text-red-600'
                              : part.isLowStock
                                ? 'text-orange-600'
                                : 'text-muted-foreground',
                          )}
                        >
                          {part.quantity} in stock
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
          Close
        </Button>
      </DialogContent>
    </Dialog>
  );
}
