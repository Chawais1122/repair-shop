import { z } from 'zod';

export const customerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  phone: z
    .string()
    .min(1, 'Phone is required')
    .regex(/^\+?[\d\s\-().]{7,20}$/, 'Invalid phone number format'),
  email: z.string().email('Invalid email address').or(z.literal('')).optional(),
  address: z.string().max(200, 'Address must be 200 characters or less').optional(),
  notes: z.string().optional(),
});

export type CustomerFormValues = z.infer<typeof customerSchema>;
