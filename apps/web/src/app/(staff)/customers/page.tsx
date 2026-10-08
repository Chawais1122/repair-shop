import Link from 'next/link';
import { AlertCircle, Plus, Search, Users } from 'lucide-react';
import { getCustomers } from '@/lib/api/customers';
import { ApiError } from '@/lib/api/client';
import { Pagination } from '@/components/shared/pagination';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { Alert, AlertDescription } from '@/components/ui/alert';
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

interface Props {
  searchParams: Promise<{ search?: string; page?: string }>;
}

export default async function CustomersPage({ searchParams }: Props) {
  const { search, page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? '1', 10) || 1);

  let result;
  try {
    result = await getCustomers({ search, page, limit: 20 });
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      return (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Your session has expired. Please{' '}
            <Link href="/login" className="font-medium underline">
              sign in again
            </Link>
            .
          </AlertDescription>
        </Alert>
      );
    }
    throw err;
  }

  const { data: customers, meta } = result;

  const buildHref = (p: number) => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    params.set('page', String(p));
    return `/customers?${params.toString()}`;
  };

  return (
    <div>
      <PageHeader
        title="Customers"
        actions={
          <Button asChild>
            <Link href="/customers/new">
              <Plus />
              Add customer
            </Link>
          </Button>
        }
      />

      <form action="/customers" method="get" className="mb-5 flex flex-wrap gap-2">
        <label htmlFor="customer-search" className="sr-only">
          Search customers
        </label>
        <div className="relative w-full sm:w-72">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="customer-search"
            type="text"
            name="search"
            defaultValue={search}
            placeholder="Search by name, phone, or email…"
            className="bg-background pl-8"
          />
        </div>
        <input type="hidden" name="page" value="1" />
        <Button type="submit" variant="outline">
          Search
        </Button>
        {search && (
          <Button asChild variant="ghost">
            <Link href="/customers">Clear</Link>
          </Button>
        )}
      </form>

      {customers.length === 0 ? (
        <EmptyState
          icon={<Users />}
          message={search ? `No customers found for "${search}".` : 'No customers yet.'}
          actionLabel={search ? undefined : 'Add your first customer'}
          actionHref={search ? undefined : '/customers/new'}
          className="bg-background"
        />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-4">Name</TableHead>
                <TableHead className="px-4">Phone</TableHead>
                <TableHead className="hidden px-4 sm:table-cell">Email</TableHead>
                <TableHead className="hidden px-4 sm:table-cell">Added</TableHead>
                <TableHead className="px-4">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="px-4 font-medium">
                    <Link
                      href={`/customers/${c.id}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {c.name}
                    </Link>
                  </TableCell>
                  <TableCell className="px-4 text-muted-foreground">{c.phone}</TableCell>
                  <TableCell className="hidden px-4 text-muted-foreground sm:table-cell">
                    {c.email ?? '—'}
                  </TableCell>
                  <TableCell className="hidden px-4 text-muted-foreground sm:table-cell">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="px-4 text-right">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/customers/${c.id}`}>View</Link>
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
