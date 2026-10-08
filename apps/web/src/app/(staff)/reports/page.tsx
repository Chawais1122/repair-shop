import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Clock,
  DollarSign,
  Gauge,
  Percent,
  ReceiptText,
  Timer,
  TrendingUp,
  Wallet,
  Wrench,
} from 'lucide-react';
import { PaymentMethod, UserRole } from '@repair-shop/shared';
import { getCurrentUser } from '@/lib/api/customers';
import { getMetrics } from '@/lib/api/reports';
import { formatCurrency, toDateParam } from '@/lib/format';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ROLE_LABELS } from '../team/components/role-badge';
import { DailySalesChart } from './components/daily-sales-chart';

interface Props {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}

const PRESETS = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
  { key: 'month', label: 'This month' },
  { key: 'last-month', label: 'Last month' },
] as const;

const METHOD_LABELS: Record<PaymentMethod, string> = {
  [PaymentMethod.CASH]: 'Cash',
  [PaymentMethod.CARD]: 'Card',
  [PaymentMethod.BANK_TRANSFER]: 'Bank transfer',
};

function dayStart(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** Resolves the selected period to [from, to) — "to" is exclusive (midnight after the last day). */
function resolveRange(params: { range?: string; from?: string; to?: string }): {
  from: Date;
  to: Date;
  key: string;
} {
  const today = dayStart(new Date());
  if (params.from && params.to) {
    const from = dayStart(new Date(`${params.from}T00:00:00`));
    const to = addDays(dayStart(new Date(`${params.to}T00:00:00`)), 1);
    if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime()) && to > from) {
      return { from, to, key: 'custom' };
    }
  }
  switch (params.range) {
    case 'today':
      return { from: today, to: addDays(today, 1), key: 'today' };
    case '7d':
      return { from: addDays(today, -6), to: addDays(today, 1), key: '7d' };
    case 'month':
      return {
        from: new Date(today.getFullYear(), today.getMonth(), 1),
        to: addDays(today, 1),
        key: 'month',
      };
    case 'last-month':
      return {
        from: new Date(today.getFullYear(), today.getMonth() - 1, 1),
        to: new Date(today.getFullYear(), today.getMonth(), 1),
        key: 'last-month',
      };
    default:
      return { from: addDays(today, -29), to: addDays(today, 1), key: '30d' };
  }
}

export default async function ReportsPage({ searchParams }: Props) {
  const viewer = await getCurrentUser();
  if (viewer?.role !== UserRole.ADMIN) redirect('/dashboard');

  const { from, to, key } = resolveRange(await searchParams);
  const m = await getMetrics({ from: from.toISOString(), to: to.toISOString() });

  const lastDay = addDays(to, -1);
  const collectedMax = Math.max(...m.collected.byMethod.map((x) => Number(x.total)), 0);
  const profitAfterLabor = Number(m.profit.profitAfterLabor);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description={`${from.toLocaleDateString()} – ${lastDay.toLocaleDateString()}`}
        className="mb-0"
      />

      {/* Filters: one row above the charts */}
      <div className="flex flex-wrap items-end gap-2">
        <nav className="flex flex-wrap gap-1" aria-label="Report period">
          {PRESETS.map((p) => (
            <Link
              key={p.key}
              href={`/reports?range=${p.key}`}
              aria-current={key === p.key ? 'page' : undefined}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                key === p.key
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              {p.label}
            </Link>
          ))}
        </nav>
        <form method="GET" className="ml-auto flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="report-from" className="text-xs">
              From
            </Label>
            <Input
              id="report-from"
              type="date"
              name="from"
              defaultValue={toDateParam(from)}
              className="h-8 bg-background"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="report-to" className="text-xs">
              To
            </Label>
            <Input
              id="report-to"
              type="date"
              name="to"
              defaultValue={toDateParam(lastDay)}
              className="h-8 bg-background"
            />
          </div>
          <Button type="submit" size="sm" variant="outline">
            Apply
          </Button>
        </form>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Net sales"
          value={formatCurrency(m.sales.netSales)}
          sub={`${m.sales.invoiceCount} invoices · avg ${formatCurrency(m.sales.averageSale)}`}
          icon={<TrendingUp />}
        />
        <StatCard
          label="Gross profit"
          value={formatCurrency(m.profit.grossProfit)}
          sub={
            m.profit.grossMarginPercent !== null
              ? `${m.profit.grossMarginPercent}% margin after parts`
              : 'No sales yet'
          }
          accent="green"
          icon={<Percent />}
        />
        <StatCard
          label="Revenue per labor hour"
          value={
            m.productivity.revenuePerLaborHour
              ? formatCurrency(m.productivity.revenuePerLaborHour)
              : '—'
          }
          sub={`${m.productivity.hoursWorked}h worked`}
          accent="blue"
          icon={<Gauge />}
        />
        <StatCard
          label="Collected"
          value={formatCurrency(m.collected.total)}
          sub="Payments received"
          icon={<Wallet />}
        />
        <StatCard
          label="Labor cost"
          value={formatCurrency(m.profit.laborCost)}
          sub="Hours × hourly rates"
          icon={<Clock />}
        />
        <StatCard
          label="Profit after labor"
          value={formatCurrency(m.profit.profitAfterLabor)}
          accent={profitAfterLabor < 0 ? 'red' : 'default'}
          sub="Before rent and overheads"
          icon={<DollarSign />}
        />
        <StatCard
          label="Repairs completed"
          value={m.repairs.completed}
          sub={`${m.repairs.created} checked in · ${m.repairs.cancelled} cancelled`}
          icon={<Wrench />}
        />
        <StatCard
          label="Avg turnaround"
          value={
            m.repairs.averageTurnaroundHours !== null
              ? m.repairs.averageTurnaroundHours >= 48
                ? `${Math.round((m.repairs.averageTurnaroundHours / 24) * 10) / 10} days`
                : `${m.repairs.averageTurnaroundHours}h`
              : '—'
          }
          sub="Check-in to pickup"
          icon={<Timer />}
        />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Net sales per day</CardTitle>
          <CardDescription>Invoiced sales before tax, excluding void invoices.</CardDescription>
        </CardHeader>
        <CardContent>
          <DailySalesChart
            valueLabel="Net sales"
            data={m.daily.map((d) => ({ date: d.date, value: Number(d.netSales) }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Staff performance</CardTitle>
          <CardDescription>
            Sales are credited to whoever rang up the invoice; repairs to the assigned technician.
            Monthly targets are prorated to this period.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-2">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-6">Employee</TableHead>
                <TableHead className="px-6 text-right">Net sales</TableHead>
                <TableHead className="hidden px-6 text-right sm:table-cell">Repairs</TableHead>
                <TableHead className="hidden px-6 text-right md:table-cell">Hours</TableHead>
                <TableHead className="hidden px-6 text-right md:table-cell">Sales / hour</TableHead>
                <TableHead className="px-6">Target</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {m.staff.map((s) => (
                <TableRow key={s.user.id}>
                  <TableCell className="px-6">
                    <p className="font-medium">{s.user.name}</p>
                    <p className="text-xs text-muted-foreground">{ROLE_LABELS[s.user.role]}</p>
                  </TableCell>
                  <TableCell className="px-6 text-right font-medium tabular-nums">
                    {formatCurrency(s.netSales)}
                    <p className="text-xs font-normal text-muted-foreground">
                      {s.invoiceCount} invoices
                    </p>
                  </TableCell>
                  <TableCell className="hidden px-6 text-right tabular-nums sm:table-cell">
                    {s.repairsCompleted}
                  </TableCell>
                  <TableCell className="hidden px-6 text-right tabular-nums md:table-cell">
                    {s.hoursWorked}
                  </TableCell>
                  <TableCell className="hidden px-6 text-right tabular-nums md:table-cell">
                    {s.salesPerHour ? formatCurrency(s.salesPerHour) : '—'}
                  </TableCell>
                  <TableCell className="w-48 px-6">
                    {s.targetProgress !== null ? (
                      <div className="space-y-1">
                        <div
                          className="h-2 overflow-hidden rounded-full bg-muted"
                          role="progressbar"
                          aria-valuenow={Math.round(s.targetProgress)}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`${s.user.name} target progress`}
                        >
                          <div
                            className="h-full rounded-full bg-chart-1"
                            style={{ width: `${Math.min(100, s.targetProgress)}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {s.targetProgress}% of {formatCurrency(s.periodTarget)}
                        </p>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">No target</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top products</CardTitle>
            <CardDescription>By revenue from parts and products sold.</CardDescription>
          </CardHeader>
          <CardContent className={m.topProducts.length === 0 ? undefined : 'px-0 pb-2'}>
            {m.topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No product sales in this period.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="px-6">Product</TableHead>
                    <TableHead className="px-6 text-right">Qty</TableHead>
                    <TableHead className="px-6 text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {m.topProducts.map((p) => (
                    <TableRow key={p.partId}>
                      <TableCell className="px-6">
                        <Link
                          href={`/inventory/${p.partId}`}
                          className="underline-offset-4 hover:underline"
                        >
                          {p.name}
                        </Link>
                      </TableCell>
                      <TableCell className="px-6 text-right tabular-nums">{p.quantity}</TableCell>
                      <TableCell className="px-6 text-right font-medium tabular-nums">
                        {formatCurrency(p.revenue)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payments by method</CardTitle>
            <CardDescription>Money received in this period.</CardDescription>
          </CardHeader>
          <CardContent>
            {m.collected.byMethod.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payments in this period.</p>
            ) : (
              <ul className="space-y-4">
                {m.collected.byMethod.map((x) => (
                  <li key={x.method} className="space-y-1.5">
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="font-medium">{METHOD_LABELS[x.method]}</span>
                      <span className="tabular-nums">
                        {formatCurrency(x.total)}{' '}
                        <span className="text-xs text-muted-foreground">({x.count})</span>
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                      <div
                        className="h-full rounded-full bg-chart-1"
                        style={{
                          width: `${collectedMax > 0 ? (Number(x.total) / collectedMax) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <ReceiptText className="size-3.5" aria-hidden="true" />
        Gross sales incl. tax {formatCurrency(m.sales.grossSales)} · tax{' '}
        {formatCurrency(m.sales.tax)} · discounts {formatCurrency(m.sales.discounts)}
      </p>
    </div>
  );
}
