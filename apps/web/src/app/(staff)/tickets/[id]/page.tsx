import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Pencil } from 'lucide-react';
import { getTicket, getTechnicians } from '@/lib/api/tickets';
import { getPaymentSummary } from '@/lib/api/payments';
import { ApiError } from '@/lib/api/client';
import { TicketStatusBadge } from '@/components/shared/ticket-status-badge';
import { PaymentSection } from '@/components/shared/payment-section';
import { PageBreadcrumb } from '@/components/shared/page-breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { StatusTimeline } from './status-timeline';
import { UpdateStatusForm } from './update-status-form';
import { AssignTechnicianForm } from './assign-technician-form';

interface PageProps {
  params: Promise<{ id: string }>;
}

const PRIORITY_STYLES: Record<string, string> = {
  LOW: 'text-muted-foreground',
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
        <PageBreadcrumb
          className="mb-2"
          items={[{ label: 'Tickets', href: '/tickets' }, { label: ticket.ticketNumber }]}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{ticket.ticketNumber}</h1>
            <TicketStatusBadge status={ticket.status} />
          </div>
          <Button asChild variant="outline">
            <Link href={`/tickets/${id}/edit`}>
              <Pencil />
              Edit ticket
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ticket Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                <div>
                  <dt className="text-muted-foreground">Priority</dt>
                  <dd className={cn('mt-0.5 capitalize', PRIORITY_STYLES[ticket.priority])}>
                    {ticket.priority.toLowerCase()}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Received</dt>
                  <dd className="mt-0.5">{new Date(ticket.receivedAt).toLocaleDateString()}</dd>
                </div>
                {ticket.expectedCompletionAt && (
                  <div>
                    <dt className="text-muted-foreground">Expected by</dt>
                    <dd className="mt-0.5">
                      {new Date(ticket.expectedCompletionAt).toLocaleDateString()}
                    </dd>
                  </div>
                )}
                {ticket.completedAt && (
                  <div>
                    <dt className="text-muted-foreground">Completed</dt>
                    <dd className="mt-0.5">
                      {new Date(ticket.completedAt).toLocaleDateString()}
                    </dd>
                  </div>
                )}
                <div className="col-span-2">
                  <dt className="text-muted-foreground">Problem reported</dt>
                  <dd className="mt-1 whitespace-pre-wrap">{ticket.reportedProblem}</dd>
                </div>
                {ticket.diagnosis && (
                  <div className="col-span-2">
                    <dt className="text-muted-foreground">Diagnosis</dt>
                    <dd className="mt-1 whitespace-pre-wrap">{ticket.diagnosis}</dd>
                  </div>
                )}
                {ticket.estimatedCost !== null && (
                  <div>
                    <dt className="text-muted-foreground">Estimate</dt>
                    <dd className="mt-0.5 font-medium">${ticket.estimatedCost}</dd>
                  </div>
                )}
                {ticket.finalCost !== null && (
                  <div>
                    <dt className="text-muted-foreground">Final cost</dt>
                    <dd className="mt-0.5 font-medium">${ticket.finalCost}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status History</CardTitle>
            </CardHeader>
            <CardContent>
              <StatusTimeline history={ticket.statusHistory} />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar column */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Customer</CardTitle>
            </CardHeader>
            <CardContent>
              <Link
                href={`/customers/${ticket.customer.id}`}
                className="text-sm font-medium underline-offset-4 hover:underline"
              >
                {ticket.customer.name}
              </Link>
              <p className="mt-0.5 text-sm text-muted-foreground">{ticket.customer.phone}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Device</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium">
                {ticket.device.brand} {ticket.device.model}
              </p>
              <p className="mt-0.5 text-sm capitalize text-muted-foreground">
                {ticket.device.type.toLowerCase()}
              </p>
            </CardContent>
          </Card>

          <AssignTechnicianForm
            ticketId={ticket.id}
            currentAssignedId={ticket.assignedTo?.id ?? null}
            technicians={technicians}
          />

          <UpdateStatusForm ticketId={ticket.id} currentStatus={ticket.status} />

          <PaymentSection ticketId={ticket.id} initialSummary={paymentSummary} />
        </div>
      </div>
    </div>
  );
}
