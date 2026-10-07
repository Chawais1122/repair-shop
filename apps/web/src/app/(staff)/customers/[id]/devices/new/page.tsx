import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCustomer } from '@/lib/api/customers';
import { ApiError } from '@/lib/api/client';
import { DeviceForm } from '@/components/shared/device-form';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function NewDevicePage({ params }: Props) {
  const { id } = await params;

  let customer;
  try {
    customer = await getCustomer(id);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <nav className="mb-6 flex items-center gap-1.5 text-sm text-gray-500" aria-label="Breadcrumb">
        <Link href="/customers" className="hover:text-indigo-600">
          Customers
        </Link>
        <span aria-hidden="true">/</span>
        <Link href={`/customers/${id}`} className="hover:text-indigo-600">
          {customer.name}
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-gray-900">Add device</span>
      </nav>

      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Add device</h1>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <DeviceForm mode="create" customerId={id} />
      </div>
    </div>
  );
}
