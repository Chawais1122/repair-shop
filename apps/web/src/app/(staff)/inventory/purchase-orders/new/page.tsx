import { getSuppliers } from '@/lib/api/inventory';
import { EmptyState } from '@/components/shared/empty-state';
import { PageBreadcrumb } from '@/components/shared/page-breadcrumb';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { PurchaseOrderForm } from '../../components/purchase-order-form';

export default async function NewPurchaseOrderPage() {
  const { data: suppliers } = await getSuppliers({ limit: 100 });

  return (
    <div className="mx-auto max-w-3xl">
      <PageBreadcrumb
        items={[
          { label: 'Purchase orders', href: '/inventory/purchase-orders' },
          { label: 'New' },
        ]}
      />
      <PageHeader title="New purchase order" />
      {suppliers.length === 0 ? (
        <EmptyState
          message="Add a supplier before creating a purchase order."
          actionLabel="Add supplier"
          actionHref="/inventory/suppliers/new"
          className="bg-background"
        />
      ) : (
        <Card>
          <CardContent className="pt-6">
            <PurchaseOrderForm mode="create" suppliers={suppliers} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
