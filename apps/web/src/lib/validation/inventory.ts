import { z } from 'zod';

// Decimal precision is enforced by the API; the inputs use step="0.01".
const money = (label: string) =>
  z.number({ error: `${label} is required` }).min(0, `${label} cannot be negative`);

const optionalText = (max: number) => z.string().max(max, `Must be ${max} characters or less`);

export const partSchema = z.object({
  sku: z
    .string()
    .min(1, 'SKU is required')
    .max(50, 'SKU must be 50 characters or less')
    .regex(/^[A-Za-z0-9._-]+$/, 'Letters, numbers, . _ and - only'),
  name: z.string().min(1, 'Name is required').max(150, 'Name must be 150 characters or less'),
  category: optionalText(60),
  description: optionalText(1000),
  costPrice: money('Cost'),
  sellPrice: money('Price'),
  initialQuantity: z.number().int('Whole numbers only').min(0, 'Cannot be negative').optional(),
  lowStockThreshold: z.number().int('Whole numbers only').min(0, 'Cannot be negative'),
  supplierId: z.string(),
});

export type PartFormValues = z.infer<typeof partSchema>;

export const adjustStockSchema = z.object({
  change: z
    .number({ error: 'Enter a quantity' })
    .int('Whole numbers only')
    .refine((v) => v !== 0, 'Change cannot be zero'),
  note: z.string().min(1, 'A reason is required').max(300, 'Must be 300 characters or less'),
});

export type AdjustStockValues = z.infer<typeof adjustStockSchema>;

export const supplierSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  contactName: optionalText(100),
  email: z.string().email('Invalid email address').or(z.literal('')),
  phone: optionalText(30),
  website: z.string().url('Enter a full URL, e.g. https://example.com').or(z.literal('')),
  notes: optionalText(1000),
});

export type SupplierFormValues = z.infer<typeof supplierSchema>;

export const purchaseOrderSchema = z.object({
  supplierId: z.string().min(1, 'Select a supplier'),
  notes: optionalText(1000),
  items: z
    .array(
      z.object({
        partId: z.string().min(1),
        partName: z.string(),
        quantity: z.number({ error: 'Required' }).int('Whole numbers only').min(1, 'At least 1'),
        unitCost: money('Cost'),
      }),
    )
    .min(1, 'Add at least one part'),
});

export type PurchaseOrderFormValues = z.infer<typeof purchaseOrderSchema>;

export const laborItemSchema = z.object({
  description: z.string().min(1, 'Description is required').max(200, 'Too long'),
  quantity: z.number({ error: 'Required' }).int('Whole numbers only').min(1, 'At least 1'),
  unitPrice: money('Price'),
});

export type LaborItemValues = z.infer<typeof laborItemSchema>;
