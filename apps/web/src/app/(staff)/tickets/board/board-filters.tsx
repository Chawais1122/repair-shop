import Link from 'next/link';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Technician } from '@/types/ticket';

// Radix Select does not allow an empty-string item value, so "all" stands in for no filter
const ALL_TECHNICIANS = 'all';

interface Props {
  technicians: Technician[];
  assignedToId?: string;
  search?: string;
}

export function BoardFilters({ technicians, assignedToId, search }: Props) {
  const hasFilters = Boolean(search || (assignedToId && assignedToId !== ALL_TECHNICIANS));

  return (
    <form method="GET" className="mb-5 flex flex-wrap items-center gap-2">
      <label htmlFor="board-search" className="sr-only">
        Search tickets
      </label>
      <div className="relative w-full sm:w-64">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          id="board-search"
          name="search"
          defaultValue={search}
          placeholder="Search by ticket # or customer…"
          className="bg-background pl-8"
        />
      </div>
      <label htmlFor="board-technician" className="sr-only">
        Filter by technician
      </label>
      <Select name="assignedToId" defaultValue={assignedToId || ALL_TECHNICIANS}>
        <SelectTrigger id="board-technician" className="w-full bg-background sm:w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_TECHNICIANS}>All technicians</SelectItem>
          {technicians.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="submit" variant="outline">
        Filter
      </Button>
      {hasFilters && (
        <Button asChild variant="ghost">
          <Link href="/tickets/board">Clear</Link>
        </Button>
      )}
    </form>
  );
}
