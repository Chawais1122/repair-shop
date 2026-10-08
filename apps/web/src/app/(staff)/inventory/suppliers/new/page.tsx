import { PageBreadcrumb } from '@/components/shared/page-breadcrumb';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { SupplierForm } from '../../components/supplier-form';

export default function NewSupplierPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageBreadcrumb
        items={[{ label: 'Suppliers', href: '/inventory/suppliers' }, { label: 'New supplier' }]}
      />
      <PageHeader title="Add supplier" />
      <Card>
        <CardContent className="pt-6">
          <SupplierForm mode="create" />
        </CardContent>
      </Card>
    </div>
  );
}
