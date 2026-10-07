import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTicket, getTechnicians } from '@/lib/api/tickets';
import { getPaymentSummary } from '@/lib/api/payments';
import { TicketStatusBadge } from '@/components/shared/ticket-status-badge';
import { PaymentSection } from '@/components/shared/payment-section';
import { StatusTimeline } from './status-timeline';
import { UpdateStatusForm } from './update-status-form';
import { AssignTechnicianForm } from './assign-technician-form';
import { ApiError } from '@/lib/api/client';

interface PageProps {
  params: Promise<{ id: string }>;
}

const PRIORITY_STYLES: Record<string, string> = {
  LOW: 'text-gray-500',
  NORMAL: 'text-blue-600',
  HIGH: 'text-orange-600',
  URGENT: 'text-red-600 font-semibold',
};

export default async function TicketDetailPage({ params }: PageProps) {
  const { id } = await params;

  let ticket;
  try {
    ticket = await getTicket(id);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  const [technicians, paymentSummary] = await Promise.all([
    getTechnicians(),
    getPaymentSummary(id),
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <nav className="mb-2 flex items-center gap-1.5 text-sm text-gray-500" aria-label="Breadcrumb">
          <Link href="/tickets" className="hover:text-indigo-600">
            Tickets
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-gray-900">{ticket.ticketNumber}</span>
        </nav>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-gray-900">{ticket.ticketNumber}</h1>
            <TicketStatusBadge status={ticket.status} />
          </div>
          <Link
            href={`/tickets/${id}/edit`}
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-300"
          >
            Edit ticket
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-900">Ticket Details</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <div>
                <dt className="text-gray-500">Priority</dt>
                <dd className={`mt-0.5 capitalize ${PRIORITY_STYLES[ticket.priority] ?? 'text-gray-900'}`}>
                  {ticket.priority.toLowerCase()}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Received</dt>
                <dd className="mt-0.5 text-gray-900">
                  {new Date(ticket.receivedAt).toLocaleDateString()}
                </dd>
              </div>
              {ticket.expectedCompletionAt && (
                <div>
                  <dt className="text-gray-500">Expected by</dt>
                  <dd className="mt-0.5 text-gray-900">
                    {new Date(ticket.expectedCompletionAt).toLocaleDateString()}
                  </dd>
                </div>
              )}
              {ticket.completedAt && (
                <div>
                  <dt className="text-gray-500">Completed</dt>
                  <dd className="mt-0.5 text-gray-900">
                    {new Date(ticket.completedAt).toLocaleDateString()}
                  </dd>
                </div>
              )}
              <div className="col-span-2">
                <dt className="text-gray-500">Problem reported</dt>
                <dd className="mt-1 whitespace-pre-wrap text-gray-900">{ticket.reportedProblem}</dd>
              </div>
              {ticket.diagnosis && (
                <div className="col-span-2">
                  <dt className="text-gray-500">Diagnosis</dt>
                  <dd className="mt-1 whitespace-pre-wrap text-gray-900">{ticket.diagnosis}</dd>
                </div>
              )}
              {ticket.estimatedCost !== null && (
                <div>
                  <dt className="text-gray-500">Estimate</dt>
                  <dd className="mt-0.5 font-medium text-gray-900">${ticket.estimatedCost}</dd>
                </div>
              )}
              {ticket.finalCost !== null && (
                <div>
                  <dt className="text-gray-500">Final cost</dt>
                  <dd className="mt-0.5 font-medium text-gray-900">${ticket.finalCost}</dd>
                </div>
              )}
            </dl>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <StatusTimeline history={ticket.statusHistory} />
          </section>
        </div>

        {/* Sidebar column */}
        <div className="space-y-4">
          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Customer
            </h2>
            <Link
              href={`/customers/${ticket.customer.id}`}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
            >
              {ticket.customer.name}
            </Link>
            <p className="mt-0.5 text-sm text-gray-500">{ticket.customer.phone}</p>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Device
            </h2>
            <p className="text-sm font-medium text-gray-900">
              {ticket.device.brand} {ticket.device.model}
            </p>
            <p className="mt-0.5 text-sm capitalize text-gray-500">
              {ticket.device.type.toLowerCase()}
            </p>
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

          <PaymentSection ticketId={ticket.id} initialSummary={paymentSummary} />
        </div>
      </div>
    </div>
  );
}
