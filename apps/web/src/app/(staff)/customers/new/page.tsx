import { CustomerForm } from '@/components/shared/customer-form';
import { PageBreadcrumb } from '@/components/shared/page-breadcrumb';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';

export default function NewCustomerPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageBreadcrumb
        items={[{ label: 'Customers', href: '/customers' }, { label: 'New customer' }]}
      />

      <PageHeader title="Add customer" />

      <Card>
        <CardContent className="pt-6">
          <CustomerForm mode="create" />
        </CardContent>
      </Card>
    </div>
  );
}
