'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Package, Search } from 'lucide-react';
import type { PaginatedResponse } from '@repair-shop/shared';
import { clientFetch } from '@/lib/api/client';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import type { Part } from '@/types/inventory';

interface Props {
  onAdd: (part: Part) => void;
  /** Quantity of each part already in the cart, so stock limits account for it. */
  inCart: Record<string, number>;
}

export function ProductBrowser({ onAdd, inCart }: Props) {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isPending, isFetching, isError } = useQuery({
    queryKey: ['parts', 'pos', debounced],
    queryFn: () =>
      clientFetch<PaginatedResponse<Part>>(
        `/parts?limit=24${debounced ? `&search=${encodeURIComponent(debounced)}` : ''}`,
      ),
  });

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          aria-label="Search products"
          placeholder="Search products by name or SKU…"
          className="bg-background pl-8"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {isFetching && !isPending && (
          <Loader2
            className="absolute right-2.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
            aria-hidden="true"
          />
        )}
      </div>

      {isPending ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-destructive">
          Failed to load products.
        </p>
      ) : data.data.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-8 text-center">
          <Package className="size-6 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">No products found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {data.data.map((part) => {
            const available = part.quantity - (inCart[part.id] ?? 0);
            const soldOut = available <= 0;
            return (
              <button
                key={part.id}
                type="button"
                disabled={soldOut}
                onClick={() => onAdd(part)}
                className={cn(
                  'flex min-h-24 flex-col justify-between rounded-lg border bg-card p-3 text-left shadow-sm transition-colors hover:border-primary/50 hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
                )}
              >
                <span className="line-clamp-2 text-sm font-medium">{part.name}</span>
                <span className="mt-2 flex items-end justify-between gap-2">
                  <span className="font-semibold">{formatCurrency(part.sellPrice)}</span>
                  <span
                    className={cn(
                      'text-xs',
                      soldOut
                        ? 'text-red-600'
                        : part.isLowStock
                          ? 'text-orange-600'
                          : 'text-muted-foreground',
                    )}
                  >
                    {soldOut ? 'Sold out' : `${available} left`}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
