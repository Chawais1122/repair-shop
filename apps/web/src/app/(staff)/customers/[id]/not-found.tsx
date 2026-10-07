import Link from 'next/link';

export default function CustomerNotFound() {
  return (
    <div className="py-20 text-center">
      <h2 className="text-xl font-semibold text-gray-900">Customer not found</h2>
      <p className="mt-2 text-sm text-gray-500">
        This customer may have been deleted or the URL is incorrect.
      </p>
      <Link
        href="/customers"
        className="mt-6 inline-block rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
      >
        Back to customers
      </Link>
    </div>
  );
}
