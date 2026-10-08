import { UserRole } from '@repair-shop/shared';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'Admin',
  [UserRole.STAFF]: 'Front desk',
  [UserRole.TECHNICIAN]: 'Technician',
};

const STYLES: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'bg-purple-100 text-purple-700 hover:bg-purple-100',
  [UserRole.STAFF]: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
  [UserRole.TECHNICIAN]: 'bg-amber-100 text-amber-800 hover:bg-amber-100',
};

export function RoleBadge({ role }: { role: UserRole }) {
  return (
    <Badge variant="secondary" className={cn('font-medium shadow-none', STYLES[role])}>
      {ROLE_LABELS[role]}
    </Badge>
  );
}
