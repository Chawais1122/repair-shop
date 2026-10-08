import { notFound } from 'next/navigation';
import { getDevice } from '@/lib/api/devices';
import { getCustomer } from '@/lib/api/customers';
import { ApiError } from '@/lib/api/client';
import { DeviceForm } from '@/components/shared/device-form';
import { PageBreadcrumb } from '@/components/shared/page-breadcrumb';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';

interface Props {
  params: Promise<{ id: string; deviceId: string }>;
}

export default async function EditDevicePage({ params }: Props) {
  const { id, deviceId } = await params;

  let device;
  let customer;
  try {
    [device, customer] = await Promise.all([getDevice(deviceId), getCustomer(id)]);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageBreadcrumb
        items={[
          { label: 'Customers', href: '/customers' },
          { label: customer.name, href: `/customers/${id}` },
          { label: `${device.brand} ${device.model}`, href: `/customers/${id}/devices/${deviceId}` },
          { label: 'Edit' },
        ]}
      />

      <PageHeader title="Edit device" />

      <Card>
        <CardContent className="pt-6">
          <DeviceForm mode="edit" customerId={id} device={device} />
        </CardContent>
      </Card>
    </div>
  );
}
