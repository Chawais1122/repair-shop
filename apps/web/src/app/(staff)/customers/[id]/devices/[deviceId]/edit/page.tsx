import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDevice } from '@/lib/api/devices';
import { getCustomer } from '@/lib/api/customers';
import { ApiError } from '@/lib/api/client';
import { DeviceForm } from '@/components/shared/device-form';

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
      <div className="mb-6 flex items-center gap-2 text-sm text-gray-500">
        <Link href="/customers" className="hover:text-indigo-600">
          Customers
        </Link>
        <span>/</span>
        <Link href={`/customers/${id}`} className="hover:text-indigo-600">
          {customer.name}
        </Link>
        <span>/</span>
        <Link
          href={`/customers/${id}/devices/${deviceId}`}
          className="hover:text-indigo-600"
        >
          {device.brand} {device.model}
        </Link>
        <span>/</span>
        <span className="text-gray-900">Edit</span>
      </div>

      <h1 className="mb-6 text-2xl font-bold text-gray-900">Edit device</h1>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <DeviceForm mode="edit" customerId={id} device={device} />
      </div>
    </div>
  );
}
