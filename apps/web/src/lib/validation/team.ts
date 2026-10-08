import { z } from 'zod';
import { UserRole } from '@repair-shop/shared';

const optionalMoney = z
  .number()
  .min(0, 'Cannot be negative')
  .optional()
  .or(z.nan().transform(() => undefined));

const roleEnum = z.enum([UserRole.ADMIN, UserRole.STAFF, UserRole.TECHNICIAN]);

export const employeeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Too long'),
  email: z.string().email('Enter a valid email'),
  role: roleEnum,
  phone: z.string().max(30, 'Too long'),
  hourlyRate: optionalMoney,
  monthlySalesTarget: optionalMoney,
  // Only required when creating
  password: z.string(),
});

export type EmployeeFormValues = z.infer<typeof employeeSchema>;

export const passwordSchema = z
  .string()
  .min(8, 'At least 8 characters')
  .max(100, 'At most 100 characters');

export const timeEntrySchema = z
  .object({
    userId: z.string().min(1, 'Select an employee'),
    clockIn: z.string().min(1, 'Required'),
    clockOut: z.string(),
    notes: z.string().max(300, 'Too long'),
  })
  .refine((v) => !v.clockOut || new Date(v.clockOut) > new Date(v.clockIn), {
    path: ['clockOut'],
    message: 'Clock-out must be after clock-in',
  });

export type TimeEntryFormValues = z.infer<typeof timeEntrySchema>;
