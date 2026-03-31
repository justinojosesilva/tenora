/* eslint-disable @typescript-eslint/no-explicit-any */
import { Decimal } from '@prisma/client/runtime/library'
import { describe, it, expect, vi, type MockedFunction } from 'vitest'
import { UserRole, type TenantStatus } from '@prisma/client'
import type { Context } from '@tenora/trpc'
import { splitRouter } from '../split.router'

const TEST_UUID = '550e8400-e29b-41d4-a716-446655440000'
const TEST_OWNER_ID = '550e8400-e29b-41d4-a716-446655440001'
const TENANT_A = 'tenant-a-id'

// Create a mock context for testing
const createMockContext = (
  role: UserRole = UserRole.financeiro,
  tenantId: string = TENANT_A,
): Context => {
  const mockDb = {
    transaction: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    transactionSplit: {
      findMany: vi.fn(),
      createMany: vi.fn(),
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
      role,
      tenantId,
    },
    tenantId,
    db: mockDb as unknown as Context['db'],
    redis: {} as Context['redis'],
    tenant: {
      id: tenantId,
      name: `Test Tenant ${tenantId}`,
      status: 'active' as TenantStatus,
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

    it('rejeita summary com role operacional (requer admin/financeiro)', async () => {
      const ctx = createMockContext(UserRole.operacional, TENANT_A)

      const caller = splitRouter.createCaller(ctx) as any

      try {
        await caller.summary({})
        expect.fail('Deveria ter lançado erro UNAUTHORIZED')
      } catch (error: any) {
        expect(error.code).toBe('FORBIDDEN')
      }
    })

    it('rejeita summary com role visualizador (requer admin/financeiro)', async () => {
      const ctx = createMockContext(UserRole.visualizador, TENANT_A)

      const caller = splitRouter.createCaller(ctx) as any

      try {
        await caller.summary({})
        expect.fail('Deveria ter lançado erro UNAUTHORIZED')
      } catch (error: any) {
        expect(error.code).toBe('FORBIDDEN')
      }
    })
  })

  describe('applyToTransaction', () => {
    it('aplica split com admin role', async () => {
      const ctx = createMockContext(UserRole.admin, TENANT_A)
      const mockTransaction = {
        id: TEST_UUID,
        tenantId: TENANT_A,
        amount: new Decimal('2000.00'),
        lease: {
          rentAmount: new Decimal('2000.00'),
          adminFeePct: new Decimal('10'),
          property: { ownerId: TEST_OWNER_ID },
        },
        splits: [],
      }

      const mockTx = {
        transactionSplit: { createMany: vi.fn().mockResolvedValue({}) },
        ownerAccount: { upsert: vi.fn().mockResolvedValue({}) },
        transaction: { update: vi.fn().mockResolvedValue({ id: TEST_UUID, splits: [] }) },
      }
      ;(ctx.db.transaction.findUnique as MockedFunction<any>).mockResolvedValue(mockTransaction)
      ;(ctx.db.$transaction as MockedFunction<any>).mockImplementation((cb: any) => cb(mockTx))

      const caller = splitRouter.createCaller(ctx) as any
      const result = await caller.applyToTransaction({ transactionId: TEST_UUID })

      expect(result.id).toBe(TEST_UUID)
      expect(mockTx.transactionSplit.createMany).toHaveBeenCalled()
      expect(mockTx.ownerAccount.upsert).toHaveBeenCalled()
    })

    it('aplica split com financeiro role', async () => {
      const ctx = createMockContext(UserRole.financeiro, TENANT_A)
      const mockTransaction = {
        id: TEST_UUID,
        tenantId: TENANT_A,
        amount: new Decimal('2000.00'),
        lease: {
          rentAmount: new Decimal('2000.00'),
          adminFeePct: new Decimal('10'),
          property: { ownerId: TEST_OWNER_ID },
        },
        splits: [],
      }

      const mockTx = {
        transactionSplit: { createMany: vi.fn().mockResolvedValue({}) },
        ownerAccount: { upsert: vi.fn().mockResolvedValue({}) },
        transaction: { update: vi.fn().mockResolvedValue({ id: TEST_UUID, splits: [] }) },
      }
      ;(ctx.db.transaction.findUnique as MockedFunction<any>).mockResolvedValue(mockTransaction)
      ;(ctx.db.$transaction as MockedFunction<any>).mockImplementation((cb: any) => cb(mockTx))

      const caller = splitRouter.createCaller(ctx) as any
      const result = await caller.applyToTransaction({ transactionId: TEST_UUID })

      expect(result.id).toBe(TEST_UUID)
    })

    it('rejeita applyToTransaction com role operacional (requer admin/financeiro)', async () => {
      const ctx = createMockContext(UserRole.operacional, TENANT_A)

      const caller = splitRouter.createCaller(ctx) as any

      try {
        await caller.applyToTransaction({ transactionId: TEST_UUID })
        expect.fail('Deveria ter lançado erro UNAUTHORIZED')
      } catch (error: any) {
        expect(error.code).toBe('FORBIDDEN')
      }
    })

    it('rejeita applyToTransaction com role visualizador (requer admin/financeiro)', async () => {
      const ctx = createMockContext(UserRole.visualizador, TENANT_A)

      const caller = splitRouter.createCaller(ctx) as any

      try {
        await caller.applyToTransaction({ transactionId: TEST_UUID })
        expect.fail('Deveria ter lançado erro UNAUTHORIZED')
      } catch (error: any) {
        expect(error.code).toBe('FORBIDDEN')
      }
    })

    it('lança NOT_FOUND para transação inexistente', async () => {
      const ctx = createMockContext(UserRole.admin, TENANT_A)
      ;(ctx.db.transaction.findUnique as MockedFunction<any>).mockResolvedValue(null)

      const caller = splitRouter.createCaller(ctx) as any

      try {
        await caller.applyToTransaction({ transactionId: TEST_UUID })
        expect.fail('Deveria ter lançado erro NOT_FOUND')
      } catch (error: any) {
        expect(error.code).toBe('NOT_FOUND')
      }
    })

    it('lança BAD_REQUEST se transação não vinculada a lease', async () => {
      const ctx = createMockContext(UserRole.admin, TENANT_A)
      const mockTransaction = {
        id: TEST_UUID,
        tenantId: TENANT_A,
        lease: null,
        splits: [],
      }
      ;(ctx.db.transaction.findUnique as MockedFunction<any>).mockResolvedValue(mockTransaction)

      const caller = splitRouter.createCaller(ctx) as any

      try {
        await caller.applyToTransaction({ transactionId: TEST_UUID })
        expect.fail('Deveria ter lançado erro BAD_REQUEST')
      } catch (error: any) {
        expect(error.code).toBe('BAD_REQUEST')
      }
    })

    it('lança CONFLICT se split já foi aplicado', async () => {
      const ctx = createMockContext(UserRole.admin, TENANT_A)
      const mockTransaction = {
        id: TEST_UUID,
        tenantId: TENANT_A,
        lease: { rentAmount: new Decimal('2000.00'), adminFeePct: new Decimal('10') },
        splits: [{ id: 'split-1', party: 'agency', amount: new Decimal('200') }],
      }
      ;(ctx.db.transaction.findUnique as MockedFunction<any>).mockResolvedValue(mockTransaction)

      const caller = splitRouter.createCaller(ctx) as any

      try {
        await caller.applyToTransaction({ transactionId: TEST_UUID })
        expect.fail('Deveria ter lançado erro CONFLICT')
      } catch (error: any) {
        expect(error.code).toBe('CONFLICT')
      }
    })

    it('isolamento de tenant: aplica split apenas no tenant atual', async () => {
      const ctx = createMockContext(UserRole.admin, TENANT_A)
      const mockTransaction = {
        id: TEST_UUID,
        tenantId: TENANT_A,
        amount: new Decimal('2000.00'),
        lease: {
          rentAmount: new Decimal('2000.00'),
          adminFeePct: new Decimal('10'),
          property: { ownerId: TEST_OWNER_ID },
        },
        splits: [],
      }

      const mockTx = {
        transactionSplit: { createMany: vi.fn().mockResolvedValue({}) },
        ownerAccount: { upsert: vi.fn().mockResolvedValue({}) },
        transaction: { update: vi.fn().mockResolvedValue({ id: TEST_UUID, splits: [] }) },
      }
      ;(ctx.db.transaction.findUnique as MockedFunction<any>).mockResolvedValue(mockTransaction)
      ;(ctx.db.$transaction as MockedFunction<any>).mockImplementation((cb: any) => cb(mockTx))

      const caller = splitRouter.createCaller(ctx) as any
      await caller.applyToTransaction({ transactionId: TEST_UUID })

      // Verify that createMany was called with tenantId = TENANT_A
      expect(mockTx.transactionSplit.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({ tenantId: TENANT_A }),
            expect.objectContaining({ tenantId: TENANT_A }),
          ]),
        }),
      )
    })
  })

  describe('byTransaction', () => {
    it('retorna splits com role visualizador (sem restrição de role)', async () => {
      const ctx = createMockContext(UserRole.visualizador, TENANT_A)
      const mockSplits = [
        {
          id: 'split-1',
          transactionId: TEST_UUID,
          party: 'agency' as const,
          amount: new Decimal('200.00'),
          description: 'Taxa de administração',
          tenantId: TENANT_A,
          createdAt: new Date(),
        },
      ]

      ;(ctx.db.transactionSplit.findMany as MockedFunction<any>).mockResolvedValue(mockSplits)

      const caller = splitRouter.createCaller(ctx) as any
      const result = await caller.byTransaction({ transactionId: TEST_UUID })

      expect(result).toHaveLength(1)
      expect(result[0].party).toBe('agency')
    })

    it('isolamento de tenant: byTransaction filtra por transactionId apenas (RLS no DB)', async () => {
      const ctx = createMockContext(UserRole.financeiro, TENANT_A)
      const mockSplits = [
        {
          id: 'split-1',
          transactionId: TEST_UUID,
          party: 'owner' as const,
          amount: new Decimal('1800.00'),
          tenantId: TENANT_A,
        },
      ]

      ;(ctx.db.transactionSplit.findMany as MockedFunction<any>).mockResolvedValue(mockSplits)

      const caller = splitRouter.createCaller(ctx) as any
      const result = await caller.byTransaction({ transactionId: TEST_UUID })

      expect(ctx.db.transactionSplit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { transactionId: TEST_UUID },
        }),
      )
      expect(result[0].tenantId).toBe(TENANT_A)
    })
  })

  describe('RBAC Summary', () => {
    it('applyToTransaction: rejeita não-admin/não-financeiro', async () => {
      const roles = [UserRole.operacional, UserRole.visualizador]

      for (const role of roles) {
        const ctx = createMockContext(role, TENANT_A)
        const caller = splitRouter.createCaller(ctx) as any

        try {
          await caller.applyToTransaction({ transactionId: TEST_UUID })
          expect.fail(`Role ${role} deveria ter sido rejeitado`)
        } catch (error: any) {
          expect(error.code).toBe('FORBIDDEN')
        }
      }
    })

    it('summary: permite admin e financeiro', async () => {
      const roles = [UserRole.admin, UserRole.financeiro]

      for (const role of roles) {
        const ctx = createMockContext(role, TENANT_A)
        ;(ctx.db.transactionSplit.findMany as MockedFunction<any>).mockResolvedValue([])

        const caller = splitRouter.createCaller(ctx) as any
        const result = await caller.summary({})

        expect(result).toEqual({ agency: 0, owner: 0 })
      }
    })

    it('byTransaction: permite todos os roles autenticados', async () => {
      const roles = [
        UserRole.admin,
        UserRole.financeiro,
        UserRole.operacional,
        UserRole.visualizador,
      ]

      for (const role of roles) {
        const ctx = createMockContext(role, TENANT_A)
        ;(ctx.db.transactionSplit.findMany as MockedFunction<any>).mockResolvedValue([])

        const caller = splitRouter.createCaller(ctx) as any
        const result = await caller.byTransaction({ transactionId: TEST_UUID })

        expect(result).toEqual([])
      }
    })
  })
})
