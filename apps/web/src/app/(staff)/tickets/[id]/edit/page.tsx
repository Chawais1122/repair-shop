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
      <div className="mb-6 flex items-center gap-3">
        <Link
          href={`/tickets/${id}`}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← {ticket.ticketNumber}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Edit Ticket</h1>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <EditTicketForm ticket={ticket} />
      </div>
    </div>
  );
}
