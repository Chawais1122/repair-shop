import { PageBreadcrumb } from '@/components/shared/page-breadcrumb';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { CreateTicketForm } from './create-ticket-form';

export default function NewTicketPage() {
  return (
    <div className="mx-auto max-w-xl">
      <PageBreadcrumb items={[{ label: 'Tickets', href: '/tickets' }, { label: 'New ticket' }]} />

      <PageHeader title="New ticket" />

      <Card>
        <CardContent className="pt-6">
          <CreateTicketForm />
        </CardContent>
      </Card>
    </div>
  );
}
