import Link from 'next/link';
import { CustomerForm } from '@/components/shared/customer-form';

export default function NewCustomerPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center gap-2 text-sm text-gray-500">
        <Link href="/customers" className="hover:text-indigo-600">
          Customers
        </Link>
        <span>/</span>
        <span className="text-gray-900">New customer</span>
      </div>

      <h1 className="mb-6 text-2xl font-bold text-gray-900">Add customer</h1>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <CustomerForm mode="create" />
      </div>
    </div>
  );
}
