import { notFound, redirect } from 'next/navigation';
import { UserRole } from '@repair-shop/shared';
import { ApiError } from '@/lib/api/client';
import { getCurrentUser } from '@/lib/api/customers';
import { getUser } from '@/lib/api/team';
import { PageBreadcrumb } from '@/components/shared/page-breadcrumb';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { EmployeeForm } from '../components/employee-form';
import { EmployeeAccountActions } from './employee-account-actions';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EmployeePage({ params }: Props) {
  const { id } = await params;
  const viewer = await getCurrentUser();
  if (viewer?.role !== UserRole.ADMIN) redirect('/team/timesheets');

  let employee;
  try {
    employee = await getUser(id);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageBreadcrumb items={[{ label: 'Employees', href: '/team' }, { label: employee.name }]} />
      <PageHeader
        title={employee.name}
        description={employee.email}
        actions={
          <EmployeeAccountActions
            employee={employee}
            isSelf={viewer.id === employee.id}
          />
        }
      />
      <Card>
        <CardContent className="pt-6">
          <EmployeeForm mode="edit" employee={employee} />
        </CardContent>
      </Card>
    </div>
  );
}
