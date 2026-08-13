import { z } from 'zod';

/** Claim number validator — accepts formats like CLM-2026-4471 or free text (spec allows either) */
export const claimSchema = z
  .string()
  .trim()
  .min(1, 'Claim number or file name is required');

/** Email validator */
export const emailSchema = z.string().email('Please enter a valid email');

/** Client form validator per spec 10.2 Add/Edit Client Modal */
export const clientFormSchema = z.object({
  name: z.string().trim().min(1, 'Client name is required'),
  company_legal_name: z.string().trim().optional(),
  client_type: z.enum(['Insurance Company', 'Adjuster', 'Contractor', 'Other']),
  primary_contact_name: z.string().trim().optional(),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  phone: z.string().trim().optional(),
  address_line1: z.string().trim().optional(),
  address_line2: z.string().trim().optional(),
  hourly_rate: z.coerce.number().positive('Hourly rate must be positive'),
  currency: z.enum(['CAD', 'USD', 'INR']),
  gst_percent: z.coerce.number().min(0).max(100).optional(),
  province: z.string().trim().optional(),
  discount_terms: z.string().trim().optional(),
  invoice_prefix: z.string().trim().optional(),
  invoice_start_number: z.coerce.number().int().nonnegative().optional(),
  reset_yearly: z.boolean().optional(),
  active: z.boolean(),
  notes: z.string().trim().optional(),
});

/** Rule form validator per spec 11.2 */
export const ruleFormSchema = z.object({
  description: z.string().trim().min(1, 'Description is required'),
  hours: z.coerce.number().positive('Hours must be positive'),
  uom: z.enum(['Hrs.', 'Min', 'per page', 'per line', 'per contractor']),
  comments: z.string().trim().optional(),
  applies_to: z.enum(['Global', 'Specific']),
  client_ids: z.array(z.string()).optional(),
  active: z.boolean(),
});
