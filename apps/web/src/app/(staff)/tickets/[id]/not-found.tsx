import Link from 'next/link';

export default function TicketNotFound() {
  return (
    <div className="py-20 text-center">
      <h2 className="text-xl font-semibold text-gray-900">Ticket not found</h2>
      <p className="mt-2 text-sm text-gray-500">
        This ticket may have been deleted or the URL is incorrect.
      </p>
      <Link
        href="/tickets"
        className="mt-6 inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
      >
        Back to tickets
      </Link>
    </div>
  );
}
