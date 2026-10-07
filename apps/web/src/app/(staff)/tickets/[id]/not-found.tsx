import Link from 'next/link';

export default function TicketNotFound() {
  return (
    <div className="py-16 text-center">
      <h2 className="text-2xl font-bold text-gray-900">Ticket not found</h2>
      <p className="mt-2 text-sm text-gray-500">
        The ticket you&apos;re looking for doesn&apos;t exist or has been removed.
      </p>
      <Link
        href="/tickets"
        className="mt-4 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-800"
      >
        Back to tickets
      </Link>
    </div>
  );
}
