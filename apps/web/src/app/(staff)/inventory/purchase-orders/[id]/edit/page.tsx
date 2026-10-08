import { notFound, redirect } from 'next/navigation';
import { PurchaseOrderStatus } from '@repair-shop/shared';
import { ApiError } from '@/lib/api/client';
import { getPurchaseOrder, getSuppliers } from '@/lib/api/inventory';
import { PageBreadcrumb } from '@/components/shared/page-breadcrumb';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { PurchaseOrderForm } from '../../../components/purchase-order-form';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditPurchaseOrderPage({ params }: Props) {
  const { id } = await params;

  let data;
  try {
    data = await Promise.all([getPurchaseOrder(id), getSuppliers({ limit: 100 })]);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }
  const [order, suppliers] = data;

  // Only drafts are editable
  if (order.status !== PurchaseOrderStatus.DRAFT) redirect(`/inventory/purchase-orders/${id}`);

  return (
    <div className="mx-auto max-w-3xl">
      <PageBreadcrumb
        items={[
          { label: 'Purchase orders', href: '/inventory/purchase-orders' },
          { label: order.poNumber, href: `/inventory/purchase-orders/${id}` },
          { label: 'Edit' },
        ]}
      />
      <PageHeader title={`Edit ${order.poNumber}`} />
      <Card>
        <CardContent className="pt-6">
          <PurchaseOrderForm mode="edit" order={order} suppliers={suppliers.data} />
        </CardContent>
      </Card>
    </div>
  );
}
