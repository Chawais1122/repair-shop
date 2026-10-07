import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTicket, getTechnicians } from '@/lib/api/tickets';
import { TicketStatusBadge } from '@/components/shared/ticket-status-badge';
import { StatusTimeline } from './status-timeline';
import { UpdateStatusForm } from './update-status-form';
import { AssignTechnicianForm } from './assign-technician-form';
import { ApiError } from '@/lib/api/client';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TicketDetailPage({ params }: PageProps) {
  const { id } = await params;

  let ticket;
  try {
    ticket = await getTicket(id);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  const technicians = await getTechnicians();

  const priorityColors: Record<string, string> = {
    LOW: 'text-gray-500',
    NORMAL: 'text-blue-600',
    HIGH: 'text-orange-600',
    URGENT: 'text-red-600',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/tickets" className="text-sm text-gray-500 hover:text-gray-700">
            ← Tickets
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{ticket.ticketNumber}</h1>
          <TicketStatusBadge status={ticket.status} />
        </div>
        <Link
          href={`/tickets/${id}/edit`}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Edit
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-900">Ticket Details</h2>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <dt className="text-gray-500">Priority</dt>
                <dd className={`font-medium capitalize ${priorityColors[ticket.priority] ?? ''}`}>
                  {ticket.priority.toLowerCase()}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Received</dt>
                <dd>{new Date(ticket.receivedAt).toLocaleDateString()}</dd>
              </div>
              {ticket.expectedCompletionAt && (
                <div>
                  <dt className="text-gray-500">Expected By</dt>
                  <dd>{new Date(ticket.expectedCompletionAt).toLocaleDateString()}</dd>
                </div>
              )}
              {ticket.completedAt && (
                <div>
                  <dt className="text-gray-500">Completed</dt>
                  <dd>{new Date(ticket.completedAt).toLocaleDateString()}</dd>
                </div>
              )}
              <div className="col-span-2">
                <dt className="text-gray-500">Problem Reported</dt>
                <dd className="mt-1 whitespace-pre-wrap">{ticket.reportedProblem}</dd>
              </div>
              {ticket.diagnosis && (
                <div className="col-span-2">
                  <dt className="text-gray-500">Diagnosis</dt>
                  <dd className="mt-1 whitespace-pre-wrap">{ticket.diagnosis}</dd>
                </div>
              )}
              {ticket.estimatedCost !== null && (
                <div>
                  <dt className="text-gray-500">Estimate</dt>
                  <dd className="font-medium">${ticket.estimatedCost}</dd>
                </div>
              )}
              {ticket.finalCost !== null && (
                <div>
                  <dt className="text-gray-500">Final Cost</dt>
                  <dd className="font-medium">${ticket.finalCost}</dd>
                </div>
              )}
            </dl>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <StatusTimeline history={ticket.statusHistory} />
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-base font-semibold text-gray-900">Customer</h2>
            <Link
              href={`/customers/${ticket.customer.id}`}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
            >
              {ticket.customer.name}
            </Link>
            <p className="mt-1 text-sm text-gray-500">{ticket.customer.phone}</p>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-base font-semibold text-gray-900">Device</h2>
            <p className="text-sm font-medium text-gray-900">
              {ticket.device.brand} {ticket.device.model}
            </p>
            <p className="text-sm text-gray-500 capitalize">{ticket.device.type.toLowerCase()}</p>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <AssignTechnicianForm
              ticketId={ticket.id}
              currentAssignedId={ticket.assignedTo?.id ?? null}
              technicians={technicians}
            />
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <UpdateStatusForm ticketId={ticket.id} currentStatus={ticket.status} />
          </section>
        </div>
      </div>
    </div>
  );
}
