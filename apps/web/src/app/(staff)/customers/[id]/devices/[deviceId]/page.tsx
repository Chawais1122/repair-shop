import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Pencil } from 'lucide-react';
import { getDevice } from '@/lib/api/devices';
import { getCustomer } from '@/lib/api/customers';
import { ApiError } from '@/lib/api/client';
import { PageBreadcrumb } from '@/components/shared/page-breadcrumb';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DeleteDeviceButton } from './delete-device-button';

interface Props {
  params: Promise<{ id: string; deviceId: string }>;
}

export default async function DeviceDetailPage({ params }: Props) {
  const { id, deviceId } = await params;

  let device;
  let customer;
  try {
    [device, customer] = await Promise.all([getDevice(deviceId), getCustomer(id)]);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  const deviceLabel = `${device.brand} ${device.model}`;

  return (
    <div className="mx-auto max-w-2xl">
      <PageBreadcrumb
        items={[
          { label: 'Customers', href: '/customers' },
          { label: customer.name, href: `/customers/${id}` },
          { label: deviceLabel },
        ]}
      />

      <PageHeader
        title={deviceLabel}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={`/customers/${id}/devices/${deviceId}/edit`}>
                <Pencil />
                Edit
              </Link>
            </Button>
            <DeleteDeviceButton deviceId={deviceId} customerId={id} deviceLabel={deviceLabel} />
          </>
        }
      />

      <Card>
        <dl className="divide-y">
          <Row label="Type" value={device.type.charAt(0) + device.type.slice(1).toLowerCase()} />
          <Row label="Brand" value={device.brand} />
          <Row label="Model" value={device.model} />
          <Row label="Serial number" value={device.serialNumber ?? '—'} />
          <Row label="IMEI" value={device.imei ?? '—'} />
          <Row label="Passcode" value={device.hasPasscode ? 'Stored (encrypted)' : '—'} />
          <Row label="Notes" value={device.notes ?? '—'} />
          <Row label="Added" value={new Date(device.createdAt).toLocaleDateString()} />
        </dl>
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
