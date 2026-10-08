import { Skeleton } from '@/components/ui/skeleton';

export default function TicketBoardLoading() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-9 w-56" />
      </div>
      <Skeleton className="mb-5 h-9 w-96" />
      <div className="flex gap-4 overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="w-72 shrink-0 space-y-2 rounded-xl border bg-muted/50 p-2">
            <Skeleton className="h-6 w-28" />
            {[...Array(3)].map((__, j) => (
              <Skeleton key={j} className="h-28 rounded-lg" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
