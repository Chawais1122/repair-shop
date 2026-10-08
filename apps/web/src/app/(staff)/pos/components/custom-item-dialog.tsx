'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { laborItemSchema, type LaborItemValues } from '@/lib/validation/inventory';
import { FieldError } from '@/components/shared/field-error';
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
  trigger: React.ReactNode;
  onAdd: (item: LaborItemValues) => void;
}

export function CustomItemDialog({ trigger, onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LaborItemValues>({
    resolver: zodResolver(laborItemSchema),
    defaultValues: { description: '', quantity: 1 },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Custom item</DialogTitle>
          <DialogDescription>
            Charge for a service or an item that isn&apos;t tracked in inventory.
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="space-y-4"
          onSubmit={handleSubmit((values) => {
            onAdd(values);
            setOpen(false);
            reset();
          })}
        >
          <div className="space-y-2">
            <Label htmlFor="custom-description">Description</Label>
            <Input
              id="custom-description"
              placeholder="Data transfer, diagnostic fee…"
              aria-invalid={!!errors.description}
              {...register('description')}
            />
            <FieldError message={errors.description?.message} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="custom-quantity">Quantity</Label>
              <Input
                id="custom-quantity"
                type="number"
                step="1"
                min="1"
                aria-invalid={!!errors.quantity}
                {...register('quantity', { valueAsNumber: true })}
              />
              <FieldError message={errors.quantity?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="custom-price">Price ($)</Label>
              <Input
                id="custom-price"
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
            <Button type="submit">Add to sale</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
