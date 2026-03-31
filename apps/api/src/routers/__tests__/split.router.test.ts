/* eslint-disable @typescript-eslint/no-explicit-any */
import { Decimal } from '@prisma/client/runtime/library'
import { describe, it, expect, vi, type MockedFunction } from 'vitest'
import { UserRole } from '@prisma/client'
import type { Context } from '@tenora/trpc'
import { splitRouter } from '../split.router'

const TEST_UUID = '550e8400-e29b-41d4-a716-446655440000'

// Create a mock context for testing
const createMockContext = (): Context => {
  const mockDb = {
    transaction: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    transactionSplit: {
      findMany: vi.fn(),
    },
    ownerAccount: {
      upsert: vi.fn(),
    },
    $transaction: vi.fn(),
  }

  return {
    user: {
      id: 'test-user-id',
      name: 'Test User',
      role: UserRole.financeiro,
      tenantId: 'test-tenant-id',
    },
    tenantId: 'test-tenant-id',
    db: mockDb as unknown as Context['db'],
    redis: {} as Context['redis'],
    tenant: {
      id: 'test-tenant-id',
      name: 'Test Tenant',
      status: 'active' as const,
    } as Context['tenant'],
  } as Context
}

describe('splitRouter', () => {
  describe('byTransaction', () => {
    it('retorna splits de uma transação', async () => {
      const ctx = createMockContext()
      const mockSplits = [
        {
          id: 'split-1',
          transactionId: TEST_UUID,
          party: 'agency' as const,
          amount: new Decimal('200.00'),
          description: 'Taxa de administração',
          tenantId: 'test-tenant-id',
          createdAt: new Date(),
        },
        {
          id: 'split-2',
          transactionId: TEST_UUID,
          party: 'owner' as const,
          amount: new Decimal('1800.00'),
          description: 'Repasse ao proprietário',
          tenantId: 'test-tenant-id',
          createdAt: new Date(),
        },
      ]

      ;(
        ctx.db.transactionSplit.findMany as MockedFunction<typeof ctx.db.transactionSplit.findMany>
      ).mockResolvedValue(mockSplits as any)

      const caller = splitRouter.createCaller(ctx) as any
      const result = await caller.byTransaction({ transactionId: TEST_UUID })

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({ party: 'agency' })
      expect(Number(result[0].amount)).toBe(200)
      expect(result[1]).toMatchObject({ party: 'owner' })
      expect(Number(result[1].amount)).toBe(1800)
    })

    it('retorna array vazio se não houver splits', async () => {
      const ctx = createMockContext()
      ;(
        ctx.db.transactionSplit.findMany as MockedFunction<typeof ctx.db.transactionSplit.findMany>
      ).mockResolvedValue([])

      const caller = splitRouter.createCaller(ctx) as any
      const result = await caller.byTransaction({ transactionId: TEST_UUID })

      expect(result).toEqual([])
    })
  })

  describe('summary', () => {
    it('agrega splits por periodo corretamente', async () => {
      const ctx = createMockContext()
      const mockSplits = [
        { party: 'agency' as const, amount: new Decimal('200') },
        { party: 'owner' as const, amount: new Decimal('1800') },
        { party: 'agency' as const, amount: new Decimal('150') },
        { party: 'owner' as const, amount: new Decimal('1350') },
      ]

      ;(
        ctx.db.transactionSplit.findMany as MockedFunction<typeof ctx.db.transactionSplit.findMany>
      ).mockResolvedValue(mockSplits as any)

      const caller = splitRouter.createCaller(ctx) as any
      const result = await caller.summary({
        dateFrom: '2026-01-01T00:00:00Z',
        dateTo: '2026-12-31T23:59:59Z',
      })

      expect(result).toEqual({
        agency: 350,
        owner: 3150,
      })
    })

    it('retorna zero para ambas as parties se não houver splits', async () => {
      const ctx = createMockContext()
      ;(
        ctx.db.transactionSplit.findMany as MockedFunction<typeof ctx.db.transactionSplit.findMany>
      ).mockResolvedValue([])

      const caller = splitRouter.createCaller(ctx) as any
      const result = await caller.summary({
        dateFrom: '2026-01-01T00:00:00Z',
        dateTo: '2026-12-31T23:59:59Z',
      })

      expect(result).toEqual({
        agency: 0,
        owner: 0,
      })
    })

    it('funciona sem dateFrom/dateTo', async () => {
      const ctx = createMockContext()
      const mockSplits = [
        { party: 'agency' as const, amount: new Decimal('100') },
        { party: 'owner' as const, amount: new Decimal('900') },
      ]

      ;(
        ctx.db.transactionSplit.findMany as MockedFunction<typeof ctx.db.transactionSplit.findMany>
      ).mockResolvedValue(mockSplits as any)

      const caller = splitRouter.createCaller(ctx) as any
      const result = await caller.summary({})

      expect(result).toEqual({
        agency: 100,
        owner: 900,
      })
    })

    it('filtra por dateFrom apenas', async () => {
      const ctx = createMockContext()
      const mockSplits = [{ party: 'agency' as const, amount: new Decimal('250') }]

      ;(
        ctx.db.transactionSplit.findMany as MockedFunction<typeof ctx.db.transactionSplit.findMany>
      ).mockResolvedValue(mockSplits as any)

      const caller = splitRouter.createCaller(ctx) as any
      const result = await caller.summary({
        dateFrom: '2026-03-01T00:00:00Z',
      })

      expect(result).toEqual({
        agency: 250,
        owner: 0,
      })
    })

    it('filtra por dateTo apenas', async () => {
      const ctx = createMockContext()
      const mockSplits = [{ party: 'owner' as const, amount: new Decimal('750') }]

      ;(
        ctx.db.transactionSplit.findMany as MockedFunction<typeof ctx.db.transactionSplit.findMany>
      ).mockResolvedValue(mockSplits as any)

      const caller = splitRouter.createCaller(ctx) as any
      const result = await caller.summary({
        dateTo: '2026-03-31T23:59:59Z',
      })

      expect(result).toEqual({
        agency: 0,
        owner: 750,
      })
    })

    it('converte Decimal para number corretamente', async () => {
      const ctx = createMockContext()

      const mockSplits = [
        { party: 'agency' as const, amount: new Decimal('333.33') },
        { party: 'owner' as const, amount: new Decimal('666.67') },
      ]

      ;(
        ctx.db.transactionSplit.findMany as MockedFunction<typeof ctx.db.transactionSplit.findMany>
      ).mockResolvedValue(mockSplits as any)

      const caller = splitRouter.createCaller(ctx) as any
      const result = await caller.summary({})

      expect(result.agency).toBeCloseTo(333.33)
      expect(result.owner).toBeCloseTo(666.67)
    })
  })
})
