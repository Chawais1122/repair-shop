import Link from 'next/link';
import { SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  title: string;
  description: string;
  backHref: string;
  backLabel: string;
}

export function NotFoundState({ title, description, backHref, backLabel }: Props) {
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <SearchX className="mb-4 size-10 text-muted-foreground" aria-hidden="true" />
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      <Button asChild className="mt-6">
        <Link href={backHref}>{backLabel}</Link>
      </Button>
    </div>
  );
}
