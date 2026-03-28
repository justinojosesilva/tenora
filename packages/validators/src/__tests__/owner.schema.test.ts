import { describe, it, expect } from 'vitest'
import { OwnerCreateSchema, OwnerUpdateSchema, OwnerListSchema } from '../owner.schema.js'

describe('OwnerCreateSchema', () => {
  it('aceita CPF válido (11 dígitos)', () => {
    const result = OwnerCreateSchema.safeParse({
      name: 'João Silva',
      cpfCnpj: '123.456.789-09',
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.cpfCnpj).toBe('12345678909')
  })

  it('aceita CNPJ válido (14 dígitos)', () => {
    const result = OwnerCreateSchema.safeParse({
      name: 'Empresa Ltda',
      cpfCnpj: '12.345.678/0001-90',
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.cpfCnpj).toBe('12345678000190')
  })

  it('remove máscaras do CPF/CNPJ automaticamente', () => {
    const result = OwnerCreateSchema.parse({
      name: 'Maria',
      cpfCnpj: '123.456.789-09',
    })
    expect(result.cpfCnpj).toBe('12345678909')
  })

  it('rejeita documento com número inválido de dígitos', () => {
    const result = OwnerCreateSchema.safeParse({
      name: 'Alguém',
      cpfCnpj: '1234',
    })
    expect(result.success).toBe(false)
  })

  it('rejeita nome vazio', () => {
    const result = OwnerCreateSchema.safeParse({
      name: '',
      cpfCnpj: '12345678909',
    })
    expect(result.success).toBe(false)
  })

  it('rejeita email inválido', () => {
    const result = OwnerCreateSchema.safeParse({
      name: 'João',
      cpfCnpj: '12345678909',
      email: 'nao-e-email',
    })
    expect(result.success).toBe(false)
  })

  it('aceita email e phone opcionais ausentes', () => {
    const result = OwnerCreateSchema.safeParse({
      name: 'João',
      cpfCnpj: '12345678909',
    })
    expect(result.success).toBe(true)
  })

  it('aceita todos os campos preenchidos', () => {
    const result = OwnerCreateSchema.safeParse({
      name: 'Maria Proprietária',
      cpfCnpj: '12345678909',
      email: 'maria@email.com',
      phone: '(11) 99999-9999',
    })
    expect(result.success).toBe(true)
  })
})

describe('OwnerUpdateSchema', () => {
  it('aceita objeto vazio (todos campos opcionais)', () => {
    const result = OwnerUpdateSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('aceita atualização parcial só do nome', () => {
    const result = OwnerUpdateSchema.safeParse({ name: 'Novo Nome' })
    expect(result.success).toBe(true)
  })

  it('valida cpfCnpj mesmo em update parcial', () => {
    const result = OwnerUpdateSchema.safeParse({ cpfCnpj: '123' })
    expect(result.success).toBe(false)
  })
})

describe('OwnerListSchema', () => {
  it('aplica defaults page=1 e limit=20', () => {
    const result = OwnerListSchema.parse({})
    expect(result.page).toBe(1)
    expect(result.limit).toBe(20)
  })

  it('aceita busca com paginação personalizada', () => {
    const result = OwnerListSchema.safeParse({ search: 'Silva', page: 2, limit: 10 })
    expect(result.success).toBe(true)
  })

  it('rejeita limit acima de 100', () => {
    const result = OwnerListSchema.safeParse({ limit: 101 })
    expect(result.success).toBe(false)
  })

  it('rejeita page menor que 1', () => {
    const result = OwnerListSchema.safeParse({ page: 0 })
    expect(result.success).toBe(false)
  })
})
