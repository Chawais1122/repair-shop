'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { refreshSession } from '@/lib/api/client';

/** Only same-origin paths — never follow `//host` or absolute URLs from the query string. */
function safeNextPath(next: string | undefined): string {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';
}

export function RefreshSession({ next: rawNext }: { next?: string }) {
  const router = useRouter();
  const next = safeNextPath(rawNext);

  useEffect(() => {
    let cancelled = false;
    void refreshSession().then((ok) => {
      if (!cancelled) router.replace(ok ? next : '/login');
    });
    return () => {
      cancelled = true;
    };
  }, [next, router]);

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      Restoring your session…
    </div>
  );
}
