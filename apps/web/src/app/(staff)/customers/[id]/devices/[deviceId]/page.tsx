import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDevice } from '@/lib/api/devices';
import { getCustomer } from '@/lib/api/customers';
import { ApiError } from '@/lib/api/client';
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
        <span className="text-gray-900">
          {device.brand} {device.model}
        </span>
      </div>

      <div className="mb-4 flex items-start justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          {device.brand} {device.model}
        </h1>
        <div className="flex gap-2">
          <Link
            href={`/customers/${id}/devices/${deviceId}/edit`}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Edit
          </Link>
          <DeleteDeviceButton
            deviceId={deviceId}
            customerId={id}
            deviceLabel={`${device.brand} ${device.model}`}
          />
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <dl className="divide-y divide-gray-100">
          <Row label="Type" value={device.type} />
          <Row label="Brand" value={device.brand} />
          <Row label="Model" value={device.model} />
          <Row label="Serial number" value={device.serialNumber ?? '—'} />
          <Row label="IMEI" value={device.imei ?? '—'} />
          <Row label="Passcode" value={device.hasPasscode ? 'Stored (encrypted)' : '—'} />
          <Row label="Notes" value={device.notes ?? '—'} />
          <Row label="Added" value={new Date(device.createdAt).toLocaleDateString()} />
        </dl>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-3 gap-4 px-4 py-3">
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="col-span-2 text-sm text-gray-900">{value}</dd>
    </div>
  );
}
