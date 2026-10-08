import Link from 'next/link';
import { Mail, Phone, Plus, Search, Truck } from 'lucide-react';
import { getSuppliers } from '@/lib/api/inventory';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { Pagination } from '@/components/shared/pagination';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function displayHost(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

interface Props {
  searchParams: Promise<{ search?: string; page?: string }>;
}

export default async function SuppliersPage({ searchParams }: Props) {
  const params = await searchParams;
  const search = params.search ?? '';
  const page = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1);
  const { data: suppliers, meta } = await getSuppliers({ search: search || undefined, page });

  const buildHref = (p: number) => {
    const q = new URLSearchParams();
    if (search) q.set('search', search);
    q.set('page', String(p));
    return `/inventory/suppliers?${q.toString()}`;
  };

  return (
    <div>
      <PageHeader
        title="Suppliers"
        description="Vendors you order parts from."
        actions={
          <Button asChild>
            <Link href="/inventory/suppliers/new">
              <Plus />
              Add supplier
            </Link>
          </Button>
        }
      />

      <form method="GET" className="mb-5 flex flex-wrap gap-2">
        <label htmlFor="supplier-search" className="sr-only">
          Search suppliers
        </label>
        <div className="relative w-full sm:w-72">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="supplier-search"
            name="search"
            defaultValue={search}
            placeholder="Search suppliers…"
            className="bg-background pl-8"
          />
        </div>
        <Button type="submit" variant="outline">
          Search
        </Button>
        {search && (
          <Button asChild variant="ghost">
            <Link href="/inventory/suppliers">Clear</Link>
          </Button>
        )}
      </form>

      {suppliers.length === 0 ? (
        <EmptyState
          icon={<Truck />}
          message={search ? `No suppliers found for "${search}".` : 'No suppliers yet.'}
          actionLabel={search ? undefined : 'Add your first supplier'}
          actionHref={search ? undefined : '/inventory/suppliers/new'}
          className="bg-background"
        />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-4">Supplier</TableHead>
                <TableHead className="hidden px-4 sm:table-cell">Contact</TableHead>
                <TableHead className="hidden px-4 md:table-cell">Website</TableHead>
                <TableHead className="px-4">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="px-4">
                    <p className="font-medium">{s.name}</p>
                    {s.contactName && (
                      <p className="text-xs text-muted-foreground">{s.contactName}</p>
                    )}
                  </TableCell>
                  <TableCell className="hidden px-4 sm:table-cell">
                    <div className="space-y-0.5 text-sm text-muted-foreground">
                      {s.email && (
                        <p className="flex items-center gap-1.5">
                          <Mail className="size-3.5" aria-hidden="true" />
                          {s.email}
                        </p>
                      )}
                      {s.phone && (
                        <p className="flex items-center gap-1.5">
                          <Phone className="size-3.5" aria-hidden="true" />
                          {s.phone}
                        </p>
                      )}
                      {!s.email && !s.phone && '—'}
                    </div>
                  </TableCell>
                  <TableCell className="hidden px-4 md:table-cell">
                    {s.website ? (
                      <a
                        href={s.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm underline-offset-4 hover:underline"
                      >
                        {displayHost(s.website)}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="px-4 text-right">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/inventory/suppliers/${s.id}/edit`}>Edit</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {meta.total > meta.limit && (
            <div className="border-t px-4 py-3">
              <Pagination meta={meta} buildHref={buildHref} />
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
