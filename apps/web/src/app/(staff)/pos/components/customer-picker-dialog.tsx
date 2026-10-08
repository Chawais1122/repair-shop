'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Search, UserRound } from 'lucide-react';
import type { PaginatedResponse } from '@repair-shop/shared';
import { clientFetch } from '@/lib/api/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { Customer } from '@/types/customer';

export interface PosCustomer {
  id: string;
  name: string;
  phone: string;
}

interface Props {
  trigger: React.ReactNode;
  onSelect: (customer: PosCustomer) => void;
}

export function CustomerPickerDialog({ trigger, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isFetching } = useQuery({
    queryKey: ['customers', 'picker', debounced],
    queryFn: () =>
      clientFetch<PaginatedResponse<Customer>>(
        `/customers?limit=10&search=${encodeURIComponent(debounced)}`,
      ),
    enabled: open && debounced.length > 0,
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSearch('');
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Attach a customer</DialogTitle>
          <DialogDescription>Search by name, phone or email.</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            autoFocus
            aria-label="Search customers"
            placeholder="Search customers…"
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
        <div className="max-h-72 overflow-y-auto rounded-md border">
          {!debounced ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Start typing to find a customer.
            </p>
          ) : (data?.data.length ?? 0) === 0 && !isFetching ? (
            <p className="p-6 text-center text-sm text-muted-foreground">No customers found.</p>
          ) : (
            <ul className="divide-y">
              {data?.data.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect({ id: c.id, name: c.name, phone: c.phone });
                      setOpen(false);
                      setSearch('');
                    }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                  >
                    <UserRound className="size-4 text-muted-foreground" aria-hidden="true" />
                    <span>
                      <span className="block text-sm font-medium">{c.name}</span>
                      <span className="block text-xs text-muted-foreground">{c.phone}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
