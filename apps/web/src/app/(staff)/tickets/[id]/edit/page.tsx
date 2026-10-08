import { notFound } from 'next/navigation';
import { getTicket } from '@/lib/api/tickets';
import { ApiError } from '@/lib/api/client';
import { PageBreadcrumb } from '@/components/shared/page-breadcrumb';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
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
      <PageBreadcrumb
        items={[
          { label: 'Tickets', href: '/tickets' },
          { label: ticket.ticketNumber, href: `/tickets/${id}` },
          { label: 'Edit' },
        ]}
      />

      <PageHeader title="Edit ticket" />

      <Card>
        <CardContent className="pt-6">
          <EditTicketForm ticket={ticket} />
        </CardContent>
      </Card>
    </div>
  );
}
