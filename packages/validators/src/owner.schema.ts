import { z } from 'zod'

const cpfCnpjSchema = z
  .string()
  .transform((v) => v.replace(/\D/g, ''))
  .pipe(
    z.string().refine((v) => v.length === 11 || v.length === 14, {
      message: 'CPF deve ter 11 dígitos ou CNPJ deve ter 14 dígitos',
    }),
  )

export const OwnerCreateSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  cpfCnpj: cpfCnpjSchema,
  email: z.string().email('Email inválido').optional(),
  phone: z.string().optional(),
})

export const OwnerUpdateSchema = OwnerCreateSchema.partial()

export const OwnerListSchema = z.object({
  search: z.string().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
})

export type OwnerCreate = z.infer<typeof OwnerCreateSchema>
export type OwnerUpdate = z.infer<typeof OwnerUpdateSchema>
export type OwnerList = z.infer<typeof OwnerListSchema>
