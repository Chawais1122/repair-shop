import { z } from 'zod';

export const deviceSchema = z.object({
  type: z.enum(['PHONE', 'TABLET', 'LAPTOP', 'DESKTOP', 'WATCH', 'OTHER']),
  brand: z.string().min(1, 'Brand is required').max(100, 'Brand must be 100 characters or less'),
  model: z.string().min(1, 'Model is required').max(100, 'Model must be 100 characters or less'),
  serialNumber: z.string().max(50, 'Serial number must be 50 characters or less').optional(),
  imei: z.string().max(20, 'IMEI must be 20 characters or less').optional(),
  passcode: z.string().max(100, 'Passcode must be 100 characters or less').optional(),
  notes: z.string().optional(),
});

export type DeviceFormValues = z.infer<typeof deviceSchema>;
