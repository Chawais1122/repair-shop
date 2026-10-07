import Link from 'next/link';
import { CreateTicketForm } from './create-ticket-form';

export default function NewTicketPage() {
  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/tickets" className="text-sm text-gray-500 hover:text-gray-700">
          ← Tickets
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">New Ticket</h1>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <CreateTicketForm />
      </div>
    </div>
  );
}
