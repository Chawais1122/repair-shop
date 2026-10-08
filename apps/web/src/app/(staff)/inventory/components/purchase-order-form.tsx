'use client';

import { useRouter } from 'next/navigation';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Loader2, Plus, Trash2 } from 'lucide-react';
import { ApiError, clientFetch } from '@/lib/api/client';
import { formatCurrency } from '@/lib/format';
import {
  purchaseOrderSchema,
  type PurchaseOrderFormValues,
} from '@/lib/validation/inventory';
import { FieldError } from '@/components/shared/field-error';
import { PartPickerDialog } from '@/components/shared/part-picker-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { PurchaseOrder, Supplier } from '@/types/inventory';

interface Props {
  mode: 'create' | 'edit';
  suppliers: Supplier[];
  order?: PurchaseOrder;
}

export function PurchaseOrderForm({ mode, suppliers, order }: Props) {
  const router = useRouter();

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PurchaseOrderFormValues>({
    resolver: zodResolver(purchaseOrderSchema),
    defaultValues: {
      supplierId: order?.supplier.id ?? '',
      notes: order?.notes ?? '',
      items:
        order?.items.map((i) => ({
          partId: i.part.id,
          partName: `${i.part.name} (${i.part.sku})`,
          quantity: i.quantity,
          unitCost: Number(i.unitCost),
        })) ?? [],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const items = useWatch({ control, name: 'items' });
  const total = (items ?? []).reduce(
    (sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.unitCost) || 0),
    0,
  );

  const onSubmit = async (values: PurchaseOrderFormValues) => {
    const payload = {
      ...(mode === 'create' && { supplierId: values.supplierId }),
      notes: values.notes || undefined,
      items: values.items.map(({ partId, quantity, unitCost }) => ({ partId, quantity, unitCost })),
    };

    try {
      if (mode === 'create') {
        const res = await clientFetch<{ data: PurchaseOrder }>('/purchase-orders', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        router.push(`/inventory/purchase-orders/${res.data.id}`);
      } else {
        await clientFetch(`/purchase-orders/${order!.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        router.push(`/inventory/purchase-orders/${order!.id}`);
      }
      router.refresh();
    } catch (err) {
      setError('root', {
        message: err instanceof ApiError ? err.message : 'Something went wrong. Please try again.',
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      {errors.root && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errors.root.message}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="supplierId">
          Supplier <span className="text-destructive" aria-hidden="true">*</span>
        </Label>
        <Controller
          control={control}
          name="supplierId"
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={field.onChange}
              // The supplier is fixed once the order exists
              disabled={mode === 'edit'}
            >
              <SelectTrigger
                id="supplierId"
                onBlur={field.onBlur}
                aria-invalid={!!errors.supplierId}
              >
                <SelectValue placeholder="Select a supplier" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <FieldError message={errors.supplierId?.message} />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Items</Label>
          <PartPickerDialog
            title="Add part to order"
            excludeIds={(items ?? []).map((i) => i.partId)}
            onSelect={(part) =>
              append({
                partId: part.id,
                partName: `${part.name} (${part.sku})`,
                quantity: 1,
                unitCost: Number(part.costPrice),
              })
            }
            trigger={
              <Button type="button" variant="outline" size="sm">
                <Plus />
                Add part
              </Button>
            }
          />
        </div>

        {fields.length === 0 ? (
          <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            No parts added yet.
          </p>
        ) : (
          <div className="divide-y rounded-md border">
            {fields.map((field, index) => (
              <div key={field.id} className="flex flex-wrap items-start gap-3 p-3">
                <p className="min-w-0 flex-1 basis-full pt-2 text-sm font-medium sm:basis-auto">
                  {field.partName}
                </p>
                <div className="w-24 space-y-1">
                  <Label htmlFor={`items.${index}.quantity`} className="sr-only">
                    Quantity
                  </Label>
                  <Input
                    id={`items.${index}.quantity`}
                    type="number"
                    step="1"
                    min="1"
                    aria-label="Quantity"
                    aria-invalid={!!errors.items?.[index]?.quantity}
                    {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                  />
                  <FieldError message={errors.items?.[index]?.quantity?.message} />
                </div>
                <div className="w-28 space-y-1">
                  <Label htmlFor={`items.${index}.unitCost`} className="sr-only">
                    Unit cost
                  </Label>
                  <Input
                    id={`items.${index}.unitCost`}
                    type="number"
                    step="0.01"
                    min="0"
                    aria-label="Unit cost"
                    aria-invalid={!!errors.items?.[index]?.unitCost}
                    {...register(`items.${index}.unitCost`, { valueAsNumber: true })}
                  />
                  <FieldError message={errors.items?.[index]?.unitCost?.message} />
                </div>
                <p className="w-24 pt-2 text-right text-sm tabular-nums">
                  {formatCurrency(
                    (Number(items?.[index]?.quantity) || 0) *
                      (Number(items?.[index]?.unitCost) || 0),
                  )}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(index)}
                  aria-label={`Remove ${field.partName}`}
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
            <div className="flex justify-between px-3 py-3 text-sm font-semibold">
              <span>Total</span>
              <span className="tabular-nums">{formatCurrency(total)}</span>
            </div>
          </div>
        )}
        <FieldError message={errors.items?.message ?? errors.items?.root?.message} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" rows={3} {...register('notes')} />
        <FieldError message={errors.notes?.message} />
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" />}
          {mode === 'create' ? 'Create draft' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}
