import { describe, it, expect } from 'vitest'
import { calculate } from '../split.service'

describe('splitService.calculate', () => {
  it('calcula agency e owner corretamente', () => {
    const { agency, owner } = calculate({ amount: 2000 }, { rentAmount: 2000, adminFeePct: 10 })
    expect(agency).toBe(200)
    expect(owner).toBe(1800)
  })

  it('adminFeePct = 0: agency = 0 e owner = rentAmount', () => {
    const { agency, owner } = calculate({ amount: 1500 }, { rentAmount: 1500, adminFeePct: 0 })
    expect(agency).toBe(0)
    expect(owner).toBe(1500)
  })

  it('adminFeePct = 100: agency = rentAmount e owner = 0', () => {
    const { agency, owner } = calculate({ amount: 1000 }, { rentAmount: 1000, adminFeePct: 100 })
    expect(agency).toBe(1000)
    expect(owner).toBe(0)
  })

  it('agency + owner sempre igual a rentAmount', () => {
    const { agency, owner } = calculate(
      { amount: 1234.56 },
      { rentAmount: 1234.56, adminFeePct: 12.5 },
    )
    expect(agency + owner).toBeCloseTo(1234.56)
  })

  it('cálculo baseado em rentAmount, não no amount da transação', () => {
    // Transaction amount ligeiramente diferente (ex: pagamento em excesso)
    const { agency, owner } = calculate({ amount: 2050 }, { rentAmount: 2000, adminFeePct: 10 })
    expect(agency).toBe(200) // baseado em rentAmount
    expect(owner).toBe(1800) // baseado em rentAmount
  })

  it('funciona com objetos Decimal-like do Prisma', () => {
    // Prisma Decimal implementa valueOf() que retorna number
    const dec = (v: number) => ({
      valueOf: () => v,
      toString: () => String(v),
    })
    const { agency, owner } = calculate(
      { amount: dec(3000) },
      { rentAmount: dec(3000), adminFeePct: dec(8.5) },
    )
    expect(agency).toBeCloseTo(255)
    expect(owner).toBeCloseTo(2745)
  })

  it('arredondamento com taxa fracionária', () => {
    const { agency, owner } = calculate({ amount: 1000 }, { rentAmount: 1000, adminFeePct: 8.33 })
    expect(agency).toBeCloseTo(83.3)
    expect(owner).toBeCloseTo(916.7)
    expect(agency + owner).toBeCloseTo(1000)
  })
})
