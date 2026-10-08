import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Pencil, Plus, Smartphone } from 'lucide-react';
import { getCustomer } from '@/lib/api/customers';
import { getCustomerDevices } from '@/lib/api/devices';
import { ApiError } from '@/lib/api/client';
import { PageBreadcrumb } from '@/components/shared/page-breadcrumb';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DeleteCustomerButton } from '../delete-customer-button';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CustomerDetailPage({ params }: Props) {
  const { id } = await params;

  let customer;
  let devicesResult;
  try {
    [customer, devicesResult] = await Promise.all([
      getCustomer(id),
      getCustomerDevices(id, { limit: 50 }),
    ]);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  const devices = devicesResult.data;

  return (
    <div className="mx-auto max-w-2xl">
      <PageBreadcrumb
        items={[{ label: 'Customers', href: '/customers' }, { label: customer.name }]}
      />

      <PageHeader
        title={customer.name}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={`/customers/${id}/edit`}>
                <Pencil />
                Edit
              </Link>
            </Button>
            <DeleteCustomerButton customerId={id} customerName={customer.name} />
          </>
        }
      />

      <Card>
        <dl className="divide-y">
          <Row label="Phone" value={customer.phone} />
          <Row label="Email" value={customer.email ?? '—'} />
          <Row label="Address" value={customer.address ?? '—'} />
          <Row label="Notes" value={customer.notes ?? '—'} />
          <Row label="Added" value={new Date(customer.createdAt).toLocaleDateString()} />
        </dl>
      </Card>

      <Card className="mt-8">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg">Devices</CardTitle>
          <Button asChild size="sm">
            <Link href={`/customers/${id}/devices/new`}>
              <Plus />
              Add device
            </Link>
          </Button>
        </CardHeader>
        <CardContent className={devices.length === 0 ? undefined : 'px-0 pb-2'}>
          {devices.length === 0 ? (
            <EmptyState
              icon={<Smartphone />}
              message="No devices on record."
              actionLabel="Add first device"
              actionHref={`/customers/${id}/devices/new`}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="px-6">Type</TableHead>
                  <TableHead className="px-6">Brand / Model</TableHead>
                  <TableHead className="hidden px-6 sm:table-cell">Serial</TableHead>
                  <TableHead className="px-6">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices.map((device) => (
                  <TableRow key={device.id}>
                    <TableCell className="px-6 capitalize text-muted-foreground">
                      {device.type.toLowerCase()}
                    </TableCell>
                    <TableCell className="px-6 font-medium">
                      {device.brand} {device.model}
                    </TableCell>
                    <TableCell className="hidden px-6 text-muted-foreground sm:table-cell">
                      {device.serialNumber ?? '—'}
                    </TableCell>
                    <TableCell className="px-6 text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/customers/${id}/devices/${device.id}`}>View</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-3 gap-4 px-6 py-4">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="col-span-2 text-sm">{value}</dd>
    </div>
  );
}
