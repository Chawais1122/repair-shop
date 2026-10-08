'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Loader2, SlidersHorizontal } from 'lucide-react';
import { ApiError, clientFetch } from '@/lib/api/client';
import { adjustStockSchema, type AdjustStockValues } from '@/lib/validation/inventory';
import { FieldError } from '@/components/shared/field-error';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
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

interface Props {
  partId: string;
  partName: string;
}

export function AdjustStockDialog({ partId, partName }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<AdjustStockValues>({ resolver: zodResolver(adjustStockSchema) });

  const onSubmit = async (values: AdjustStockValues) => {
    try {
      await clientFetch(`/parts/${partId}/adjust`, {
        method: 'POST',
        body: JSON.stringify(values),
      });
      setOpen(false);
      reset();
      router.refresh();
    } catch (err) {
      setError('root', {
        message: err instanceof ApiError ? err.message : 'Failed to adjust stock',
      });
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
        <Button variant="outline">
          <SlidersHorizontal />
          Adjust stock
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust stock</DialogTitle>
          <DialogDescription>
            Correct the stock level of {partName}. Use a negative number to remove units.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          {errors.root && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.root.message}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="adjust-change">Quantity change</Label>
            <Input
              id="adjust-change"
              type="number"
              step="1"
              placeholder="e.g. 5 or -2"
              aria-invalid={!!errors.change}
              {...register('change', { valueAsNumber: true })}
            />
            <FieldError message={errors.change?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="adjust-note">Reason</Label>
            <Input
              id="adjust-note"
              placeholder="Recount, damaged, found in back room…"
              aria-invalid={!!errors.note}
              {...register('note')}
            />
            <FieldError message={errors.note?.message} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin" />}
              Save adjustment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
