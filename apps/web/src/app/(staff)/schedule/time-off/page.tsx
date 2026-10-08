import { Plane } from 'lucide-react';
import { TimeOffStatus, UserRole } from '@repair-shop/shared';
import { getCurrentUser } from '@/lib/api/customers';
import { getTimeOff } from '@/lib/api/schedule';
import { EmptyState } from '@/components/shared/empty-state';
import { PageBreadcrumb } from '@/components/shared/page-breadcrumb';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RequestTimeOffForm } from './request-time-off-form';
import { TimeOffList } from './time-off-list';

export default async function TimeOffPage() {
  const viewer = await getCurrentUser();
  const isAdmin = viewer?.role === UserRole.ADMIN;

  // Admins see everyone's requests; staff see only their own (enforced by the API)
  const requests = await getTimeOff();
  const mine = requests.filter((r) => r.user.id === viewer?.id);
  const pending = isAdmin
    ? requests.filter((r) => r.status === TimeOffStatus.PENDING && r.user.id !== viewer?.id)
    : [];
  const others = isAdmin
    ? requests.filter((r) => r.user.id !== viewer?.id && r.status !== TimeOffStatus.PENDING)
    : [];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <PageBreadcrumb items={[{ label: 'Schedule', href: '/schedule' }, { label: 'Time off' }]} />
        <PageHeader title="Time off" className="mb-0" />
      </div>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Waiting for approval ({pending.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {pending.length === 0 ? (
              <p className="text-sm text-muted-foreground">No requests to review.</p>
            ) : (
              <TimeOffList requests={pending} mode="review" viewerId={viewer!.id} />
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">My requests</CardTitle>
          </CardHeader>
          <CardContent>
            {mine.length === 0 ? (
              <EmptyState icon={<Plane />} message="You haven’t requested any time off." />
            ) : (
              <TimeOffList requests={mine} mode="own" viewerId={viewer?.id ?? ''} />
            )}
          </CardContent>
        </Card>
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Request time off</CardTitle>
          </CardHeader>
          <CardContent>
            <RequestTimeOffForm />
          </CardContent>
        </Card>
      </div>

      {isAdmin && others.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Team history</CardTitle>
          </CardHeader>
          <CardContent>
            <TimeOffList requests={others} mode="history" viewerId={viewer!.id} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
