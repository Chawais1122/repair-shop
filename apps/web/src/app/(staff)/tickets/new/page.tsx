import Link from 'next/link';
import { CreateTicketForm } from './create-ticket-form';

export default function NewTicketPage() {
  return (
    <div className="mx-auto max-w-xl">
      <nav className="mb-6 flex items-center gap-1.5 text-sm text-gray-500" aria-label="Breadcrumb">
        <Link href="/tickets" className="hover:text-indigo-600">
          Tickets
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-gray-900">New ticket</span>
      </nav>

      <h1 className="mb-6 text-2xl font-semibold text-gray-900">New ticket</h1>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <CreateTicketForm />
      </div>
    </div>
  );
}
