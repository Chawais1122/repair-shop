import { notFound } from 'next/navigation';
import { getCustomer } from '@/lib/api/customers';
import { ApiError } from '@/lib/api/client';
import { CustomerForm } from '@/components/shared/customer-form';
import { PageBreadcrumb } from '@/components/shared/page-breadcrumb';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditCustomerPage({ params }: Props) {
  const { id } = await params;

  let customer;
  try {
    customer = await getCustomer(id);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageBreadcrumb
        items={[
          { label: 'Customers', href: '/customers' },
          { label: customer.name, href: `/customers/${id}` },
          { label: 'Edit' },
        ]}
      />

      <PageHeader title="Edit customer" />

      <Card>
        <CardContent className="pt-6">
          <CustomerForm mode="edit" customer={customer} />
        </CardContent>
      </Card>
    </div>
  );
}
