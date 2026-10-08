import Link from 'next/link';
import { AlertTriangle, DollarSign, Package, PackageX, Plus, Search } from 'lucide-react';
import { getInventorySummary, getPartCategories, getParts } from '@/lib/api/inventory';
import { formatCurrency } from '@/lib/format';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { Pagination } from '@/components/shared/pagination';
import { StatCard } from '@/components/shared/stat-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StockBadge } from './components/stock-badge';

interface Props {
  searchParams: Promise<{ search?: string; category?: string; stock?: string; page?: string }>;
}

// Radix Select does not allow an empty-string item value
const ALL = 'all';

export default async function InventoryPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1);
  const search = params.search ?? '';
  const category = params.category && params.category !== ALL ? params.category : undefined;
  const lowStock = params.stock === 'low';

  const [result, summary, categories] = await Promise.all([
    getParts({ search: search || undefined, category, lowStock: lowStock || undefined, page }),
    getInventorySummary(),
    getPartCategories(),
  ]);
  const { data: parts, meta } = result;
  const filtered = Boolean(search || category || lowStock);

  const buildHref = (p: number) => {
    const q = new URLSearchParams();
    if (search) q.set('search', search);
    if (category) q.set('category', category);
    if (lowStock) q.set('stock', 'low');
    q.set('page', String(p));
    return `/inventory?${q.toString()}`;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Parts & products"
        description="Repair parts and retail products you stock and sell."
        className="mb-0"
        actions={
          <Button asChild>
            <Link href="/inventory/new">
              <Plus />
              Add part
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Active parts" value={summary.totalParts} icon={<Package />} />
        <StatCard
          label="Low stock"
          value={summary.lowStockCount}
          accent={summary.lowStockCount > 0 ? 'orange' : 'default'}
          icon={<AlertTriangle />}
        />
        <StatCard
          label="Out of stock"
          value={summary.outOfStockCount}
          accent={summary.outOfStockCount > 0 ? 'red' : 'default'}
          icon={<PackageX />}
        />
        <StatCard
          label="Stock value (cost)"
          value={formatCurrency(summary.stockValueAtCost)}
          icon={<DollarSign />}
        />
      </div>

      <form method="GET" className="flex flex-wrap items-center gap-2">
        <label htmlFor="part-search" className="sr-only">
          Search parts
        </label>
        <div className="relative w-full sm:w-64">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="part-search"
            name="search"
            defaultValue={search}
            placeholder="Search name, SKU, category…"
            className="bg-background pl-8"
          />
        </div>
        <label htmlFor="part-category" className="sr-only">
          Category
        </label>
        <Select name="category" defaultValue={category ?? ALL}>
          <SelectTrigger id="part-category" className="w-full bg-background sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <label htmlFor="part-stock" className="sr-only">
          Stock level
        </label>
        <Select name="stock" defaultValue={lowStock ? 'low' : ALL}>
          <SelectTrigger id="part-stock" className="w-full bg-background sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All stock levels</SelectItem>
            <SelectItem value="low">Low stock only</SelectItem>
          </SelectContent>
        </Select>
        <Button type="submit" variant="outline">
          Filter
        </Button>
        {filtered && (
          <Button asChild variant="ghost">
            <Link href="/inventory">Clear</Link>
          </Button>
        )}
      </form>

      {parts.length === 0 ? (
        <EmptyState
          icon={<Package />}
          message={filtered ? 'No parts match your filters.' : 'No parts in inventory yet.'}
          actionLabel={filtered ? undefined : 'Add your first part'}
          actionHref={filtered ? undefined : '/inventory/new'}
          className="bg-background"
        />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-4">Part</TableHead>
                <TableHead className="hidden px-4 md:table-cell">Category</TableHead>
                <TableHead className="px-4">Stock</TableHead>
                <TableHead className="hidden px-4 text-right sm:table-cell">Cost</TableHead>
                <TableHead className="px-4 text-right">Price</TableHead>
                <TableHead className="hidden px-4 lg:table-cell">Supplier</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parts.map((part) => (
                <TableRow key={part.id}>
                  <TableCell className="px-4">
                    <Link
                      href={`/inventory/${part.id}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {part.name}
                    </Link>
                    <p className="font-mono text-xs text-muted-foreground">{part.sku}</p>
                  </TableCell>
                  <TableCell className="hidden px-4 md:table-cell">
                    {part.category ? (
                      <Badge variant="outline" className="font-normal">
                        {part.category}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="px-4">
                    <StockBadge quantity={part.quantity} isLowStock={part.isLowStock} />
                  </TableCell>
                  <TableCell className="hidden px-4 text-right text-muted-foreground sm:table-cell">
                    {formatCurrency(part.costPrice)}
                  </TableCell>
                  <TableCell className="px-4 text-right font-medium">
                    {formatCurrency(part.sellPrice)}
                  </TableCell>
                  <TableCell className="hidden px-4 text-muted-foreground lg:table-cell">
                    {part.supplier?.name ?? '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {meta.total > meta.limit && (
            <div className="border-t px-4 py-3">
              <Pagination meta={meta} buildHref={buildHref} />
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
