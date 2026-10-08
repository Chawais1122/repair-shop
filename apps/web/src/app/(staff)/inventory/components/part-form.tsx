'use client';

import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Loader2 } from 'lucide-react';
import { ApiError, clientFetch } from '@/lib/api/client';
import { partSchema, type PartFormValues } from '@/lib/validation/inventory';
import { FieldError } from '@/components/shared/field-error';
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
import type { Part, Supplier } from '@/types/inventory';

// Radix Select does not allow an empty-string item value
const NO_SUPPLIER = 'none';

interface Props {
  mode: 'create' | 'edit';
  part?: Part;
  suppliers: Supplier[];
  categories: string[];
}

export function PartForm({ mode, part, suppliers, categories }: Props) {
  const router = useRouter();

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PartFormValues>({
    resolver: zodResolver(partSchema),
    defaultValues: {
      sku: part?.sku ?? '',
      name: part?.name ?? '',
      category: part?.category ?? '',
      description: part?.description ?? '',
      costPrice: part ? Number(part.costPrice) : undefined,
      sellPrice: part ? Number(part.sellPrice) : undefined,
      initialQuantity: mode === 'create' ? 0 : undefined,
      lowStockThreshold: part?.lowStockThreshold ?? 5,
      supplierId: part?.supplier?.id ?? NO_SUPPLIER,
    },
  });

  const onSubmit = async (values: PartFormValues) => {
    const { initialQuantity, supplierId, ...rest } = values;
    // On edit, null clears a field; undefined would leave the stored value untouched
    const empty = mode === 'create' ? undefined : null;
    const payload = {
      ...rest,
      category: rest.category || empty,
      description: rest.description || empty,
      supplierId: supplierId === NO_SUPPLIER ? empty : supplierId,
      ...(mode === 'create' && { initialQuantity }),
    };

    try {
      if (mode === 'create') {
        const res = await clientFetch<{ data: Part }>('/parts', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        router.push(`/inventory/${res.data.id}`);
      } else {
        await clientFetch(`/parts/${part!.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        router.push(`/inventory/${part!.id}`);
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

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">
            Name <span className="text-destructive" aria-hidden="true">*</span>
          </Label>
          <Input
            id="name"
            placeholder="iPhone 13 OLED screen"
            aria-invalid={!!errors.name}
            {...register('name')}
          />
          <FieldError message={errors.name?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="sku">
            SKU <span className="text-destructive" aria-hidden="true">*</span>
          </Label>
          <Input
            id="sku"
            className="font-mono"
            placeholder="SCR-IP13-OLED"
            aria-invalid={!!errors.sku}
            {...register('sku')}
          />
          <FieldError message={errors.sku?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Input
            id="category"
            list="part-categories"
            placeholder="Screens, Batteries, Accessories…"
            aria-invalid={!!errors.category}
            {...register('category')}
          />
          <datalist id="part-categories">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <FieldError message={errors.category?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="supplierId">Supplier</Label>
          <Controller
            control={control}
            name="supplierId"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="supplierId" onBlur={field.onBlur}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_SUPPLIER}>No supplier</SelectItem>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="costPrice">
            Cost ($) <span className="text-destructive" aria-hidden="true">*</span>
          </Label>
          <Input
            id="costPrice"
            type="number"
            step="0.01"
            min="0"
            aria-invalid={!!errors.costPrice}
            {...register('costPrice', { valueAsNumber: true })}
          />
          <FieldError message={errors.costPrice?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="sellPrice">
            Selling price ($) <span className="text-destructive" aria-hidden="true">*</span>
          </Label>
          <Input
            id="sellPrice"
            type="number"
            step="0.01"
            min="0"
            aria-invalid={!!errors.sellPrice}
            {...register('sellPrice', { valueAsNumber: true })}
          />
          <FieldError message={errors.sellPrice?.message} />
        </div>

        {mode === 'create' && (
          <div className="space-y-2">
            <Label htmlFor="initialQuantity">Opening stock</Label>
            <Input
              id="initialQuantity"
              type="number"
              step="1"
              min="0"
              aria-invalid={!!errors.initialQuantity}
              {...register('initialQuantity', { valueAsNumber: true })}
            />
            <FieldError message={errors.initialQuantity?.message} />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="lowStockThreshold">Low-stock alert at</Label>
          <Input
            id="lowStockThreshold"
            type="number"
            step="1"
            min="0"
            aria-invalid={!!errors.lowStockThreshold}
            {...register('lowStockThreshold', { valueAsNumber: true })}
          />
          <p className="text-xs text-muted-foreground">
            Flag this part when stock falls to this level.
          </p>
          <FieldError message={errors.lowStockThreshold?.message} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          rows={3}
          aria-invalid={!!errors.description}
          {...register('description')}
        />
        <FieldError message={errors.description?.message} />
      </div>

      {mode === 'edit' && (
        <p className="text-xs text-muted-foreground">
          To change the stock level, use <span className="font-medium">Adjust stock</span> on the
          part page so every change is recorded.
        </p>
      )}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" />}
          {isSubmitting ? 'Saving…' : mode === 'create' ? 'Create part' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}
