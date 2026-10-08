import { getPartCategories, getSuppliers } from '@/lib/api/inventory';
import { PageBreadcrumb } from '@/components/shared/page-breadcrumb';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { PartForm } from '../components/part-form';

export default async function NewPartPage() {
  const [suppliers, categories] = await Promise.all([
    getSuppliers({ limit: 100 }),
    getPartCategories(),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <PageBreadcrumb items={[{ label: 'Inventory', href: '/inventory' }, { label: 'New part' }]} />
      <PageHeader title="Add part" />
      <Card>
        <CardContent className="pt-6">
          <PartForm mode="create" suppliers={suppliers.data} categories={categories} />
        </CardContent>
      </Card>
    </div>
  );
}
