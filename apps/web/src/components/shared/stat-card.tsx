import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface Props {
  label: string;
  value: string | number;
  sub?: string;
  accent?: 'default' | 'green' | 'red' | 'blue' | 'orange';
  icon?: React.ReactNode;
}

const ACCENT_CLASSES: Record<NonNullable<Props['accent']>, string> = {
  default: 'text-foreground',
  green: 'text-green-600',
  red: 'text-red-600',
  blue: 'text-blue-600',
  orange: 'text-orange-500',
};

export function StatCard({ label, value, sub, accent = 'default', icon }: Props) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        {icon && <span className="text-muted-foreground [&_svg]:size-4">{icon}</span>}
      </CardHeader>
      <CardContent>
        <p className={cn('text-2xl font-bold sm:text-3xl', ACCENT_CLASSES[accent])}>{value}</p>
        {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}
