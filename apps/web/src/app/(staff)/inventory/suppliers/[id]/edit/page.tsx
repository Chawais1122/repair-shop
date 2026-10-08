import { notFound } from 'next/navigation';
import { ApiError } from '@/lib/api/client';
import { getSupplier } from '@/lib/api/inventory';
import { PageBreadcrumb } from '@/components/shared/page-breadcrumb';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { SupplierForm } from '../../../components/supplier-form';
import { DeleteSupplierButton } from './delete-supplier-button';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditSupplierPage({ params }: Props) {
  const { id } = await params;

  let supplier;
  try {
    supplier = await getSupplier(id);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageBreadcrumb
        items={[{ label: 'Suppliers', href: '/inventory/suppliers' }, { label: supplier.name }]}
      />
      <PageHeader
        title="Edit supplier"
        actions={<DeleteSupplierButton supplierId={supplier.id} supplierName={supplier.name} />}
      />
      <Card>
        <CardContent className="pt-6">
          <SupplierForm mode="edit" supplier={supplier} />
        </CardContent>
      </Card>
    </div>
  );
}
