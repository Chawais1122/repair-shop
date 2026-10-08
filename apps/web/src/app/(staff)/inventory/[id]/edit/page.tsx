import { notFound } from 'next/navigation';
import { ApiError } from '@/lib/api/client';
import { getPart, getPartCategories, getSuppliers } from '@/lib/api/inventory';
import { PageBreadcrumb } from '@/components/shared/page-breadcrumb';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { PartForm } from '../../components/part-form';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditPartPage({ params }: Props) {
  const { id } = await params;

  let data;
  try {
    data = await Promise.all([getPart(id), getSuppliers({ limit: 100 }), getPartCategories()]);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }
  const [part, suppliers, categories] = data;

  return (
    <div className="mx-auto max-w-2xl">
      <PageBreadcrumb
        items={[
          { label: 'Inventory', href: '/inventory' },
          { label: part.name, href: `/inventory/${id}` },
          { label: 'Edit' },
        ]}
      />
      <PageHeader title="Edit part" />
      <Card>
        <CardContent className="pt-6">
          <PartForm mode="edit" part={part} suppliers={suppliers.data} categories={categories} />
        </CardContent>
      </Card>
    </div>
  );
}
