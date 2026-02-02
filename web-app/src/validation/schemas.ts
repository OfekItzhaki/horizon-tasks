import { z } from 'zod';

const yyyyMmDd = /^\d{4}-\d{2}-\d{2}$/;
const hhMm = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required.')
    .email('Invalid email address.'),
  password: z
    .string()
    .min(1, 'Password is required.'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const taskFormSchema = z.object({
  description: z
    .string()
    .min(1, 'Description is required.')
    .trim(),
  dueDate: z
    .string()
    .trim()
    .refine((v) => !v || yyyyMmDd.test(v), 'Invalid date format. Use YYYY-MM-DD.')
    .refine((v) => {
      if (!v?.trim()) return true;
      const d = new Date(v);
      return !Number.isNaN(d.getTime());
    }, 'Invalid date.')
    .optional()
    .or(z.literal('')),
});

export type TaskFormValues = z.infer<typeof taskFormSchema>;

export const reminderConfigItemSchema = z.object({
  id: z.string().optional(),
  timeframe: z.string().optional(),
  time: z
    .string()
    .min(1, 'Time is required.')
    .regex(hhMm, 'Invalid time. Use HH:mm (e.g. 09:00).')
    .optional()
    .or(z.literal('')),
  specificDate: z.string().optional(),
  customDate: z
    .string()
    .trim()
    .refine((v) => !v || yyyyMmDd.test(v), 'Invalid date format.')
    .refine((v) => {
      if (!v?.trim()) return true;
      const d = new Date(v);
      return !Number.isNaN(d.getTime()) && d >= new Date(new Date().setHours(0, 0, 0, 0));
    }, 'Date cannot be in the past.')
    .optional(),
  dayOfWeek: z.number().min(0).max(6).optional(),
  daysBefore: z
    .string()
    .trim()
    .refine((v) => !v || (/^\d+$/.test(v) && parseInt(v, 10) >= 0), 'Must be a non-negative number.')
    .optional(),
  hasAlarm: z.boolean().optional(),
  location: z.string().optional(),
});

export const listFormSchema = z.object({
  name: z
    .string()
    .min(1, 'List name is required.')
    .trim(),
});

export type ListFormValues = z.infer<typeof listFormSchema>;
