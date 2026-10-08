import Link from 'next/link';
import { KanbanSquare, List } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  active: 'list' | 'board';
}

const VIEWS = [
  { key: 'list', href: '/tickets', label: 'List', icon: List },
  { key: 'board', href: '/tickets/board', label: 'Board', icon: KanbanSquare },
] as const;

export function TicketsViewToggle({ active }: Props) {
  return (
    <div
      className="inline-flex h-9 items-center rounded-md border bg-background p-0.5"
      role="group"
      aria-label="Ticket view"
    >
      {VIEWS.map((view) => {
        const Icon = view.icon;
        const isActive = active === view.key;
        return (
          <Link
            key={view.key}
            href={view.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'inline-flex h-full items-center gap-1.5 rounded-sm px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
              isActive
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            {view.label}
          </Link>
        );
      })}
    </div>
  );
}
