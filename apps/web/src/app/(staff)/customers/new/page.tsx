import Link from 'next/link';
import { CustomerForm } from '@/components/shared/customer-form';

export default function NewCustomerPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <nav className="mb-6 flex items-center gap-1.5 text-sm text-gray-500" aria-label="Breadcrumb">
        <Link href="/customers" className="hover:text-indigo-600">
          Customers
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-gray-900">New customer</span>
      </nav>

      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Add customer</h1>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <CustomerForm mode="create" />
      </div>
    </div>
  );
}
