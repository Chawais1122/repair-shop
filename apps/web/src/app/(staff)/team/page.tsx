import Link from 'next/link';
import { redirect } from 'next/navigation';
import { IdCard, Plus } from 'lucide-react';
import { UserRole } from '@repair-shop/shared';
import { getCurrentUser } from '@/lib/api/customers';
import { getUsers } from '@/lib/api/team';
import { formatCurrency } from '@/lib/format';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { RoleBadge } from './components/role-badge';

export default async function TeamPage() {
  const user = await getCurrentUser();
  if (user?.role !== UserRole.ADMIN) redirect('/team/timesheets');

  const { data: users } = await getUsers({ includeInactive: true, limit: 100 });

  return (
    <div>
      <PageHeader
        title="Employees"
        description="Staff accounts, roles and pay rates."
        actions={
          <Button asChild>
            <Link href="/team/new">
              <Plus />
              Add employee
            </Link>
          </Button>
        }
      />

      {users.length === 0 ? (
        <EmptyState icon={<IdCard />} message="No employees yet." className="bg-background" />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-4">Name</TableHead>
                <TableHead className="px-4">Role</TableHead>
                <TableHead className="hidden px-4 md:table-cell">Phone</TableHead>
                <TableHead className="hidden px-4 text-right sm:table-cell">Hourly rate</TableHead>
                <TableHead className="hidden px-4 text-right lg:table-cell">Monthly target</TableHead>
                <TableHead className="px-4">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id} className={u.isActive ? undefined : 'opacity-60'}>
                  <TableCell className="px-4">
                    <Link
                      href={`/team/${u.id}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {u.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </TableCell>
                  <TableCell className="px-4">
                    <RoleBadge role={u.role} />
                  </TableCell>
                  <TableCell className="hidden px-4 text-muted-foreground md:table-cell">
                    {u.phone ?? '—'}
                  </TableCell>
                  <TableCell className="hidden px-4 text-right tabular-nums sm:table-cell">
                    {u.hourlyRate ? `${formatCurrency(u.hourlyRate)}/h` : '—'}
                  </TableCell>
                  <TableCell className="hidden px-4 text-right tabular-nums lg:table-cell">
                    {formatCurrency(u.monthlySalesTarget)}
                  </TableCell>
                  <TableCell className="px-4">
                    {u.isActive ? (
                      <Badge variant="outline" className="font-normal">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="font-normal">
                        Deactivated
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
