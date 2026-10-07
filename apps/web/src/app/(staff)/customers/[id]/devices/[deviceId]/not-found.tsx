import Link from 'next/link';

export default function DeviceNotFound() {
  return (
    <div className="py-20 text-center">
      <h2 className="text-xl font-semibold text-gray-900">Device not found</h2>
      <p className="mt-2 text-sm text-gray-500">
        This device may have been deleted or the URL is incorrect.
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
