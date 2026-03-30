import { z } from 'zod'

export const BillingCreateSchema = z.object({
  leaseId: z.string().uuid(),
  amount: z.number().positive(),
  dueDate: z.coerce.date(),
  type: z.enum(['pix', 'boleto', 'transfer']).default('pix'),
  reference: z.string().optional(), // ex: "Abril 2026"
})

export const BillingListSchema = z.object({
  status: z.enum(['pending', 'paid', 'overdue', 'cancelled']).optional(),
  leaseId: z.string().uuid().optional(),
  dueDateFrom: z.coerce.date().optional(),
  dueDateTo: z.coerce.date().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
})

export const BillingMarkAsPaidSchema = z.object({
  id: z.string().uuid(),
  paidAmount: z.number().positive(),
  paidAt: z.coerce.date().optional(),
})

export type BillingCreate = z.infer<typeof BillingCreateSchema>
export type BillingList = z.infer<typeof BillingListSchema>
export type BillingMarkAsPaid = z.infer<typeof BillingMarkAsPaidSchema>
