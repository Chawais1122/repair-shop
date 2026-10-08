'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, Loader2 } from 'lucide-react';
import { ApiError, clientFetch } from '@/lib/api/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

interface Props {
  sourceWeekStart: string;
  targetWeekStart: string;
}

export function CopyWeekButton({ sourceWeekStart, targetWeekStart }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');

  async function copy() {
    setPending(true);
    setMessage('');
    try {
      const res = await clientFetch<{ data: { created: number; skipped: number } }>(
        '/shifts/copy-week',
        { method: 'POST', body: JSON.stringify({ sourceWeekStart, targetWeekStart }) },
      );
      const { created, skipped } = res.data;
      setMessage(
        `Copied ${created} shift${created === 1 ? '' : 's'}${
          skipped ? `, skipped ${skipped} that clashed` : ''
        }.`,
      );
      router.refresh();
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : 'Copy failed');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : <Copy />}
            Copy last week
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Copy last week&apos;s shifts?</AlertDialogTitle>
            <AlertDialogDescription>
              Every shift from the previous week is repeated on the same days this week. Shifts
              that clash with existing shifts or approved time off are skipped.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={copy}>Copy shifts</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {message && <p className="text-xs text-muted-foreground">{message}</p>}
    </div>
  );
}
