'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  Minus,
  Package,
  Plus,
  Printer,
  ShoppingCart,
  Trash2,
  UserRound,
  Wrench,
  X,
} from 'lucide-react';
import { TicketStatus } from '@repair-shop/shared';
import { ApiError, clientFetch } from '@/lib/api/client';
import { formatCurrency } from '@/lib/format';
import { computeSaleTotals } from '@/lib/money';
import { cn } from '@/lib/utils';
import { TakePaymentDialog } from '@/components/shared/take-payment-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import type { Part, TicketItemsSummary } from '@/types/inventory';
import type { Invoice } from '@/types/invoice';
import type { Ticket } from '@/types/ticket';
import { CustomerPickerDialog, type PosCustomer } from './components/customer-picker-dialog';
import { CustomItemDialog } from './components/custom-item-dialog';
import { PickupList } from './components/pickup-list';
import { ProductBrowser } from './components/product-browser';

interface CartLine {
  key: string;
  partId: string | null;
  description: string;
  sku: string | null;
  quantity: number;
  unitPrice: number;
  /** Stock on hand for parts — the cart won't exceed it. */
  maxQuantity: number | null;
}

interface CartTicket {
  id: string;
  ticketNumber: string;
  status: TicketStatus;
  customer: PosCustomer;
  lines: Array<{ description: string; quantity: number; unitPrice: number }>;
}

interface Props {
  pickups: Ticket[];
  preselectedTicket: Ticket | null;
}

const TAX_RATE_KEY = 'pos.taxRate';

function readStoredTaxRate(): string {
  try {
    return window.localStorage.getItem(TAX_RATE_KEY) ?? '0';
  } catch {
    return '0';
  }
}

export function PosTerminal({ pickups, preselectedTicket }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<'products' | 'pickups'>(
    preselectedTicket ? 'pickups' : 'products',
  );
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ticket, setTicket] = useState<CartTicket | null>(null);
  const [customer, setCustomer] = useState<PosCustomer | null>(null);
  const [discount, setDiscount] = useState('');
  const [taxRate, setTaxRate] = useState('0');
  const [markDelivered, setMarkDelivered] = useState(true);
  const [loadingTicketId, setLoadingTicketId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [charging, setCharging] = useState(false);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [changeDue, setChangeDue] = useState(0);
  const [completed, setCompleted] = useState(false);

  useEffect(() => setTaxRate(readStoredTaxRate()), []);

  useEffect(() => {
    if (preselectedTicket) void addTicket(preselectedTicket);
    // Only on first render for a ticket handed over from the ticket page
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const inCart = useMemo(
    () =>
      Object.fromEntries(
        lines.filter((l) => l.partId).map((l) => [l.partId as string, l.quantity]),
      ) as Record<string, number>,
    [lines],
  );

  const allLines = [...(ticket?.lines ?? []), ...lines];
  const taxRateNumber = Math.min(100, Math.max(0, Number(taxRate) || 0));
  const totals = computeSaleTotals(allLines, Number(discount) || 0, taxRateNumber);
  const isEmpty = allLines.length === 0;

  function updateTaxRate(value: string) {
    setTaxRate(value);
    try {
      window.localStorage.setItem(TAX_RATE_KEY, value);
    } catch {
      // Storage may be unavailable (private mode); the rate just won't be remembered
    }
  }

  function addPart(part: Part) {
    setError('');
    setLines((current) => {
      const existing = current.find((l) => l.partId === part.id);
      if (existing) {
        return current.map((l) =>
          l.partId === part.id ? { ...l, quantity: Math.min(l.quantity + 1, part.quantity) } : l,
        );
      }
      return [
        ...current,
        {
          key: part.id,
          partId: part.id,
          description: part.name,
          sku: part.sku,
          quantity: 1,
          unitPrice: Number(part.sellPrice),
          maxQuantity: part.quantity,
        },
      ];
    });
  }

  function addCustom(item: { description: string; quantity: number; unitPrice: number }) {
    setLines((current) => [
      ...current,
      {
        key: `custom-${Date.now()}`,
        partId: null,
        description: item.description,
        sku: null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        maxQuantity: null,
      },
    ]);
  }

  function changeQuantity(key: string, delta: number) {
    setLines((current) =>
      current.map((l) => {
        if (l.key !== key) return l;
        const next = l.quantity + delta;
        const capped = l.maxQuantity !== null ? Math.min(next, l.maxQuantity) : next;
        return { ...l, quantity: Math.max(1, capped) };
      }),
    );
  }

  async function addTicket(t: Ticket) {
    setError('');
    setLoadingTicketId(t.id);
    try {
      const res = await clientFetch<{ data: TicketItemsSummary }>(`/tickets/${t.id}/items`);
      const items = res.data.items;
      let ticketLines: CartTicket['lines'];
      if (items.length > 0) {
        ticketLines = items.map((i) => ({
          description: i.description,
          quantity: i.quantity,
          unitPrice: Number(i.unitPrice),
        }));
      } else {
        const cost = t.finalCost ?? t.estimatedCost;
        if (!cost) {
          setError(
            `${t.ticketNumber} has no parts, labor or cost yet. Add them on the ticket first.`,
          );
          return;
        }
        ticketLines = [
          { description: `Repair service — ${t.ticketNumber}`, quantity: 1, unitPrice: Number(cost) },
        ];
      }
      setTicket({
        id: t.id,
        ticketNumber: t.ticketNumber,
        status: t.status,
        customer: t.customer,
        lines: ticketLines,
      });
      setCustomer(t.customer);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load the ticket');
    } finally {
      setLoadingTicketId(null);
    }
  }

  function removeTicket() {
    setTicket(null);
    setCustomer(null);
  }

  function resetSale() {
    setLines([]);
    setTicket(null);
    setCustomer(null);
    setDiscount('');
    setInvoice(null);
    setChangeDue(0);
    setCompleted(false);
    setError('');
    router.refresh();
  }

  async function finishSale(paid: Invoice) {
    setCompleted(true);
    setPaymentOpen(false);
    if (ticket && markDelivered && ticket.status === TicketStatus.READY) {
      try {
        await clientFetch(`/tickets/${ticket.id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status: TicketStatus.DELIVERED, notes: `Paid on ${paid.invoiceNumber}` }),
        });
      } catch (err) {
        setError(
          `Payment recorded, but the ticket could not be marked delivered: ${
            err instanceof Error ? err.message : 'unknown error'
          }`,
        );
      }
    }
  }

  async function charge() {
    setCharging(true);
    setError('');
    try {
      const res = await clientFetch<{ data: Invoice }>('/invoices', {
        method: 'POST',
        body: JSON.stringify({
          customerId: customer?.id,
          ticketId: ticket?.id,
          items: lines.map((l) =>
            l.partId
              ? { partId: l.partId, quantity: l.quantity, unitPrice: l.unitPrice }
              : { description: l.description, quantity: l.quantity, unitPrice: l.unitPrice },
          ),
          // Matches the clamped value shown in the cart
          discount: totals.discount,
          taxRate: taxRateNumber,
        }),
      });
      setInvoice(res.data);
      if (Number(res.data.balanceDue) <= 0) {
        await finishSale(res.data);
      } else {
        setPaymentOpen(true);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create the sale.');
    } finally {
      setCharging(false);
    }
  }

  function handlePaid(updated: Invoice, change: number) {
    setInvoice(updated);
    setChangeDue((c) => c + change);
    if (Number(updated.balanceDue) <= 0) void finishSale(updated);
  }

  // ─── Completed sale ──────────────────────────────────────────────────────
  if (invoice && completed) {
    return (
      <Card className="mx-auto max-w-md text-center">
        <CardContent className="space-y-4 pt-8">
          <CheckCircle2 className="mx-auto size-12 text-green-600" aria-hidden="true" />
          <div>
            <h2 className="text-xl font-semibold">Sale complete</h2>
            <p className="text-sm text-muted-foreground">
              {invoice.invoiceNumber} · {formatCurrency(invoice.total)}
            </p>
          </div>
          {changeDue > 0 && (
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm text-muted-foreground">Change due</p>
              <p className="text-3xl font-bold">{formatCurrency(changeDue)}</p>
            </div>
          )}
          {error && (
            <Alert variant="destructive" className="text-left">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button asChild variant="outline">
              <Link href={`/invoices/${invoice.id}/receipt`} target="_blank">
                <Printer />
                Print receipt
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/invoices/${invoice.id}`}>View invoice</Link>
            </Button>
            <Button onClick={resetSale}>New sale</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
      {/* Catalogue */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex rounded-md border bg-background p-0.5" role="tablist">
            {(
              [
                ['products', 'Products', Package],
                ['pickups', `Repairs ready (${pickups.length})`, ClipboardCheck],
              ] as const
            ).map(([key, label, Icon]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={cn(
                  'inline-flex h-8 items-center gap-1.5 rounded-sm px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                  tab === key
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
          <CustomItemDialog
            onAdd={addCustom}
            trigger={
              <Button variant="outline" size="sm" disabled={invoice !== null}>
                <Plus />
                Custom item
              </Button>
            }
          />
        </div>

        {tab === 'products' ? (
          <ProductBrowser onAdd={addPart} inCart={inCart} />
        ) : (
          <PickupList
            tickets={pickups}
            selectedId={ticket?.id ?? null}
            loadingId={loadingTicketId}
            onSelect={(t) => void addTicket(t)}
          />
        )}
      </div>

      {/* Cart */}
      <Card className="h-fit lg:sticky lg:top-6">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShoppingCart className="size-4" aria-hidden="true" />
            Current sale
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Customer */}
          <div className="flex items-center justify-between gap-2 rounded-lg border p-3">
            <div className="flex min-w-0 items-center gap-2">
              <UserRound className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              {customer ? (
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{customer.name}</p>
                  <p className="text-xs text-muted-foreground">{customer.phone}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Walk-in customer</p>
              )}
            </div>
            {!ticket && !invoice && (
              <div className="flex shrink-0 gap-1">
                {customer && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label="Remove customer"
                    onClick={() => setCustomer(null)}
                  >
                    <X />
                  </Button>
                )}
                <CustomerPickerDialog
                  onSelect={setCustomer}
                  trigger={
                    <Button variant="outline" size="sm">
                      {customer ? 'Change' : 'Add customer'}
                    </Button>
                  }
                />
              </div>
            )}
          </div>

          {/* Lines */}
          {isEmpty ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Add products or a repair to start a sale.
            </p>
          ) : (
            <div className="space-y-3">
              {ticket && (
                <div className="rounded-lg border bg-muted/40 p-3">
                  <div className="flex items-center justify-between">
                    <p className="flex items-center gap-1.5 text-sm font-semibold">
                      <Wrench className="size-3.5" aria-hidden="true" />
                      Repair {ticket.ticketNumber}
                    </p>
                    {!invoice && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        aria-label={`Remove ${ticket.ticketNumber}`}
                        onClick={removeTicket}
                      >
                        <X />
                      </Button>
                    )}
                  </div>
                  <ul className="mt-2 space-y-1 text-sm">
                    {ticket.lines.map((l, i) => (
                      <li key={i} className="flex justify-between gap-2">
                        <span className="text-muted-foreground">
                          {l.quantity > 1 && `${l.quantity} × `}
                          {l.description}
                        </span>
                        <span className="tabular-nums">
                          {formatCurrency(l.unitPrice * l.quantity)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <ul className="divide-y">
                {lines.map((l) => (
                  <li key={l.key} className="flex items-center gap-2 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{l.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(l.unitPrice)} each
                      </p>
                    </div>
                    {!invoice && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="size-7"
                          aria-label={`Decrease ${l.description}`}
                          disabled={l.quantity <= 1}
                          onClick={() => changeQuantity(l.key, -1)}
                        >
                          <Minus />
                        </Button>
                        <span className="w-6 text-center text-sm tabular-nums">{l.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="size-7"
                          aria-label={`Increase ${l.description}`}
                          disabled={l.maxQuantity !== null && l.quantity >= l.maxQuantity}
                          onClick={() => changeQuantity(l.key, 1)}
                        >
                          <Plus />
                        </Button>
                      </div>
                    )}
                    <span className="w-20 text-right text-sm font-medium tabular-nums">
                      {formatCurrency(l.unitPrice * l.quantity)}
                    </span>
                    {!invoice && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        aria-label={`Remove ${l.description}`}
                        onClick={() => setLines((c) => c.filter((x) => x.key !== l.key))}
                      >
                        <Trash2 />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Separator />

          {/* Adjustments */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="pos-discount" className="text-xs">
                Discount ($)
              </Label>
              <Input
                id="pos-discount"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                placeholder="0.00"
                value={discount}
                disabled={invoice !== null}
                onChange={(e) => setDiscount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pos-tax" className="text-xs">
                Tax rate (%)
              </Label>
              <Input
                id="pos-tax"
                type="number"
                min="0"
                max="100"
                step="0.01"
                inputMode="decimal"
                value={taxRate}
                disabled={invoice !== null}
                onChange={(e) => updateTaxRate(e.target.value)}
              />
            </div>
          </div>

          {/* Totals */}
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="tabular-nums">{formatCurrency(totals.subtotal)}</dd>
            </div>
            {totals.discount > 0 && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Discount</dt>
                <dd className="tabular-nums">−{formatCurrency(totals.discount)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Tax</dt>
              <dd className="tabular-nums">{formatCurrency(totals.taxAmount)}</dd>
            </div>
            <div className="flex justify-between border-t pt-2 text-base font-semibold">
              <dt>Total</dt>
              <dd className="tabular-nums">
                {formatCurrency(invoice ? invoice.total : totals.total)}
              </dd>
            </div>
            {invoice && Number(invoice.amountPaid) > 0 && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Paid</dt>
                <dd className="tabular-nums">{formatCurrency(invoice.amountPaid)}</dd>
              </div>
            )}
          </dl>

          {ticket && ticket.status === TicketStatus.READY && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={markDelivered}
                onChange={(e) => setMarkDelivered(e.target.checked)}
              />
              Mark {ticket.ticketNumber} as delivered when paid
            </label>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {invoice ? (
            <div className="space-y-2">
              <Button className="h-11 w-full text-base" onClick={() => setPaymentOpen(true)}>
                Take payment · {formatCurrency(invoice.balanceDue)} due
              </Button>
              <div className="flex gap-2">
                <Button asChild variant="outline" className="flex-1">
                  <Link href={`/invoices/${invoice.id}`}>View invoice</Link>
                </Button>
                <Button variant="outline" className="flex-1" onClick={resetSale}>
                  New sale
                </Button>
              </div>
              <p className="text-center text-xs text-muted-foreground">
                {invoice.invoiceNumber} was created. You can also collect the balance later.
              </p>
            </div>
          ) : (
            <Button
              className="h-11 w-full text-base"
              disabled={isEmpty || charging}
              onClick={() => void charge()}
            >
              {charging && <Loader2 className="animate-spin" />}
              Charge {formatCurrency(totals.total)}
            </Button>
          )}
        </CardContent>
      </Card>

      {invoice && (
        <TakePaymentDialog
          open={paymentOpen}
          onOpenChange={setPaymentOpen}
          invoiceId={invoice.id}
          invoiceNumber={invoice.invoiceNumber}
          balanceDue={invoice.balanceDue}
          onPaid={handlePaid}
        />
      )}
    </div>
  );
}
