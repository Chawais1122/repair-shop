import { redirect } from 'next/navigation';
import { UserRole } from '@repair-shop/shared';
import { getCurrentUser } from '@/lib/api/customers';
import { PageBreadcrumb } from '@/components/shared/page-breadcrumb';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { EmployeeForm } from '../components/employee-form';

export default async function NewEmployeePage() {
  const user = await getCurrentUser();
  if (user?.role !== UserRole.ADMIN) redirect('/team/timesheets');

  return (
    <div className="mx-auto max-w-2xl">
      <PageBreadcrumb items={[{ label: 'Employees', href: '/team' }, { label: 'New' }]} />
      <PageHeader title="Add employee" />
      <Card>
        <CardContent className="pt-6">
          <EmployeeForm mode="create" />
        </CardContent>
      </Card>
    </div>
  );
}
