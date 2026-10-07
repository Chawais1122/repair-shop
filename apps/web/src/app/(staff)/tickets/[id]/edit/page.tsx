import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTicket } from '@/lib/api/tickets';
import { ApiError } from '@/lib/api/client';
import { EditTicketForm } from './edit-ticket-form';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditTicketPage({ params }: PageProps) {
  const { id } = await params;

  let ticket;
  try {
    ticket = await getTicket(id);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <nav className="mb-6 flex items-center gap-1.5 text-sm text-gray-500" aria-label="Breadcrumb">
        <Link href="/tickets" className="hover:text-indigo-600">
          Tickets
        </Link>
        <span aria-hidden="true">/</span>
        <Link href={`/tickets/${id}`} className="hover:text-indigo-600">
          {ticket.ticketNumber}
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-gray-900">Edit</span>
      </nav>

      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Edit ticket</h1>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <EditTicketForm ticket={ticket} />
      </div>
    </div>
  );
}
