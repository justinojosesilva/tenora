import { describe, it, expect } from 'vitest'
import {
  PropertyCreateSchema,
  PropertyUpdateSchema,
  PropertyListSchema,
} from '../property.schema.js'

describe('PropertyCreateSchema', () => {
  it('aceita payload válido', () => {
    const result = PropertyCreateSchema.safeParse({
      address: 'Rua das Flores, 123',
      type: 'residential',
      ownerId: '00000000-0000-0000-0000-000000000001',
    })
    expect(result.success).toBe(true)
  })

  it('aplica adminFeePct padrão de 10', () => {
    const result = PropertyCreateSchema.parse({
      address: 'Av. Brasil, 500',
      type: 'commercial',
      ownerId: '00000000-0000-0000-0000-000000000001',
    })
    expect(result.adminFeePct).toBe(10)
  })

  it('rejeita address vazio', () => {
    const result = PropertyCreateSchema.safeParse({
      address: '',
      type: 'residential',
      ownerId: '00000000-0000-0000-0000-000000000001',
    })
    expect(result.success).toBe(false)
  })

  it('rejeita type inválido', () => {
    const result = PropertyCreateSchema.safeParse({
      address: 'Rua A, 1',
      type: 'invalid_type',
      ownerId: '00000000-0000-0000-0000-000000000001',
    })
    expect(result.success).toBe(false)
  })

  it('rejeita ownerId que não é UUID', () => {
    const result = PropertyCreateSchema.safeParse({
      address: 'Rua A, 1',
      type: 'residential',
      ownerId: 'not-a-uuid',
    })
    expect(result.success).toBe(false)
  })

  it('rejeita adminFeePct fora do intervalo [0,100]', () => {
    const negative = PropertyCreateSchema.safeParse({
      address: 'Rua A, 1',
      type: 'residential',
      ownerId: '00000000-0000-0000-0000-000000000001',
      adminFeePct: -5,
    })
    expect(negative.success).toBe(false)

    const over = PropertyCreateSchema.safeParse({
      address: 'Rua A, 1',
      type: 'residential',
      ownerId: '00000000-0000-0000-0000-000000000001',
      adminFeePct: 101,
    })
    expect(over.success).toBe(false)
  })

  it('rejeita area negativa', () => {
    const result = PropertyCreateSchema.safeParse({
      address: 'Rua A, 1',
      type: 'residential',
      ownerId: '00000000-0000-0000-0000-000000000001',
      area: -10,
    })
    expect(result.success).toBe(false)
  })
})

describe('PropertyUpdateSchema', () => {
  it('aceita objeto vazio (todos campos opcionais)', () => {
    const result = PropertyUpdateSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('aceita atualização parcial de address', () => {
    const result = PropertyUpdateSchema.safeParse({ address: 'Nova Rua, 99' })
    expect(result.success).toBe(true)
  })

  it('rejeita type inválido mesmo em update parcial', () => {
    const result = PropertyUpdateSchema.safeParse({ type: 'wrong' })
    expect(result.success).toBe(false)
  })
})

describe('PropertyListSchema', () => {
  it('aplica defaults de page=1 e limit=20', () => {
    const result = PropertyListSchema.parse({})
    expect(result.page).toBe(1)
    expect(result.limit).toBe(20)
  })

  it('aceita todos os filtros combinados', () => {
    const result = PropertyListSchema.safeParse({
      status: 'available',
      type: 'residential',
      ownerId: '00000000-0000-0000-0000-000000000001',
      search: 'Rua das Flores',
      page: 2,
      limit: 10,
    })
    expect(result.success).toBe(true)
  })

  it('rejeita status inválido', () => {
    const result = PropertyListSchema.safeParse({ status: 'sold' })
    expect(result.success).toBe(false)
  })

  it('rejeita limit acima de 100', () => {
    const result = PropertyListSchema.safeParse({ limit: 101 })
    expect(result.success).toBe(false)
  })

  it('rejeita page menor que 1', () => {
    const result = PropertyListSchema.safeParse({ page: 0 })
    expect(result.success).toBe(false)
  })
})
