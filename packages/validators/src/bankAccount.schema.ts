import { z } from 'zod'

export const BankAccountCreateSchema = z.object({
  name: z.string().min(1).max(100),
  bankCode: z.string().min(1).max(10),
  agency: z.string().max(10).optional(),
  accountNumber: z.string().max(20).optional(),
  accountType: z.enum(['checking', 'savings']).default('checking'),
  isPrimary: z.boolean().default(false),
})

export type BankAccountCreate = z.infer<typeof BankAccountCreateSchema>
