import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCustomer } from '@/lib/api/customers';
import { getCustomerDevices } from '@/lib/api/devices';
import { ApiError } from '@/lib/api/client';
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
      <div className="mb-6 flex items-center gap-2 text-sm text-gray-500">
        <Link href="/customers" className="hover:text-indigo-600">
          Customers
        </Link>
        <span>/</span>
        <span className="text-gray-900">{customer.name}</span>
      </div>

      <div className="mb-4 flex items-start justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
        <div className="flex gap-2">
          <Link
            href={`/customers/${id}/edit`}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Edit
          </Link>
          <DeleteCustomerButton customerId={id} customerName={customer.name} />
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <dl className="divide-y divide-gray-100">
          <Row label="Phone" value={customer.phone} />
          <Row label="Email" value={customer.email ?? '—'} />
          <Row label="Address" value={customer.address ?? '—'} />
          <Row label="Notes" value={customer.notes ?? '—'} />
          <Row label="Added" value={new Date(customer.createdAt).toLocaleDateString()} />
        </dl>
      </div>

      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Devices</h2>
          <Link
            href={`/customers/${id}/devices/new`}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            Add device
          </Link>
        </div>

        {devices.length === 0 ? (
          <p className="text-sm text-gray-500">No devices on record.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Type</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Brand / Model</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Serial</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {devices.map((device) => (
                  <tr key={device.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600">{device.type}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {device.brand} {device.model}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{device.serialNumber ?? '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/customers/${id}/devices/${device.id}`}
                        className="text-indigo-600 hover:text-indigo-800"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
