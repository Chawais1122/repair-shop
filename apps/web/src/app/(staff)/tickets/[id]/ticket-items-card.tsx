'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Loader2, Package, Plus, Trash2, Wrench } from 'lucide-react';
import { ApiError, clientFetch } from '@/lib/api/client';
import { formatCurrency } from '@/lib/format';
import { laborItemSchema, type LaborItemValues } from '@/lib/validation/inventory';
import { FieldError } from '@/components/shared/field-error';
import { PartPickerDialog } from '@/components/shared/part-picker-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import type { Part, TicketItemsSummary } from '@/types/inventory';

interface Props {
  ticketId: string;
  summary: TicketItemsSummary;
  /** Delivered/cancelled tickets can't change their items. */
  locked: boolean;
  finalCost: string | null;
}

export function TicketItemsCard({ ticketId, summary, locked, finalCost }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function mutate(key: string, path: string, init: RequestInit) {
    setBusy(key);
    setError('');
    try {
      await clientFetch(path, init);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(null);
    }
  }

  const addPart = (part: Part) =>
    mutate('add-part', `/tickets/${ticketId}/items`, {
      method: 'POST',
      body: JSON.stringify({ partId: part.id, quantity: 1 }),
    });

  const total = Number(summary.total);
  const finalMatches = finalCost !== null && Number(finalCost) === total;

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base">Parts & labor</CardTitle>
        {!locked && (
          <div className="flex gap-2">
            <PartPickerDialog
              title="Add part to ticket"
              requireStock
              onSelect={addPart}
              trigger={
                <Button variant="outline" size="sm" disabled={busy !== null}>
                  {busy === 'add-part' ? <Loader2 className="animate-spin" /> : <Package />}
                  Add part
                </Button>
              }
            />
            <AddLaborDialog ticketId={ticketId} onAdded={() => router.refresh()} />
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {summary.items.length === 0 ? (
          <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            No parts or labor recorded yet.
          </p>
        ) : (
          <div className="-mx-6">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="px-6">Item</TableHead>
                  <TableHead className="px-2 text-right">Qty</TableHead>
                  <TableHead className="px-2 text-right">Price</TableHead>
                  <TableHead className="px-6 text-right">Total</TableHead>
                  {!locked && (
                    <TableHead className="w-10 pr-4">
                      <span className="sr-only">Remove</span>
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="px-6">
                      <span className="flex items-center gap-2">
                        {item.part ? (
                          <Package className="size-3.5 text-muted-foreground" aria-hidden="true" />
                        ) : (
                          <Wrench className="size-3.5 text-muted-foreground" aria-hidden="true" />
                        )}
                        <span className="font-medium">{item.description}</span>
                      </span>
                      {item.part && (
                        <span className="ml-5 font-mono text-xs text-muted-foreground">
                          {item.part.sku}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="px-2 text-right tabular-nums">{item.quantity}</TableCell>
                    <TableCell className="px-2 text-right tabular-nums">
                      {formatCurrency(item.unitPrice)}
                    </TableCell>
                    <TableCell className="px-6 text-right font-medium tabular-nums">
                      {formatCurrency(item.lineTotal)}
                    </TableCell>
                    {!locked && (
                      <TableCell className="pr-4">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          disabled={busy !== null}
                          aria-label={`Remove ${item.description}`}
                          onClick={() =>
                            mutate(`remove-${item.id}`, `/tickets/${ticketId}/items/${item.id}`, {
                              method: 'DELETE',
                            })
                          }
                        >
                          {busy === `remove-${item.id}` ? (
                            <Loader2 className="animate-spin" />
                          ) : (
                            <Trash2 />
                          )}
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <dl className="grid grid-cols-3 gap-2 rounded-lg bg-muted/50 p-4 text-sm">
          <div>
            <dt className="text-muted-foreground">Parts</dt>
            <dd className="font-medium">{formatCurrency(summary.partsTotal)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Labor</dt>
            <dd className="font-medium">{formatCurrency(summary.laborTotal)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Total</dt>
            <dd className="font-semibold">{formatCurrency(summary.total)}</dd>
          </div>
        </dl>

        {!locked && total > 0 && !finalMatches && (
          <Button
            variant="secondary"
            className="w-full"
            disabled={busy !== null}
            onClick={() =>
              mutate('final-cost', `/tickets/${ticketId}`, {
                method: 'PATCH',
                body: JSON.stringify({ finalCost: total }),
              })
            }
          >
            {busy === 'final-cost' && <Loader2 className="animate-spin" />}
            Set final cost to {formatCurrency(total)}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function AddLaborDialog({ ticketId, onAdded }: { ticketId: string; onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LaborItemValues>({
    resolver: zodResolver(laborItemSchema),
    defaultValues: { description: 'Labor', quantity: 1 },
  });

  const onSubmit = async (values: LaborItemValues) => {
    try {
      await clientFetch(`/tickets/${ticketId}/items`, {
        method: 'POST',
        body: JSON.stringify(values),
      });
      setOpen(false);
      reset();
      onAdded();
    } catch (err) {
      setError('root', { message: err instanceof ApiError ? err.message : 'Failed to add item' });
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus />
          Add labor
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add labor or service</DialogTitle>
          <DialogDescription>Charge for work, diagnostics or a custom service.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          {errors.root && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.root.message}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="labor-description">Description</Label>
            <Input
              id="labor-description"
              aria-invalid={!!errors.description}
              {...register('description')}
            />
            <FieldError message={errors.description?.message} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="labor-quantity">Quantity</Label>
              <Input
                id="labor-quantity"
                type="number"
                step="1"
                min="1"
                aria-invalid={!!errors.quantity}
                {...register('quantity', { valueAsNumber: true })}
              />
              <FieldError message={errors.quantity?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="labor-price">Price ($)</Label>
              <Input
                id="labor-price"
                type="number"
                step="0.01"
                min="0"
                aria-invalid={!!errors.unitPrice}
                {...register('unitPrice', { valueAsNumber: true })}
              />
              <FieldError message={errors.unitPrice?.message} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin" />}
              Add
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
