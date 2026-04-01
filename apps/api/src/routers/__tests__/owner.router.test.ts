/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, type MockedFunction } from 'vitest'
import { UserRole, type TenantStatus } from '@prisma/client'
import type { Context } from '@tenora/trpc'
import { ownerRouter } from '../owner.router'

const TEST_OWNER_ID = '550e8400-e29b-41d4-a716-446655440001'
const TENANT_A = 'tenant-a-id'

// Create a mock context for testing
const createMockContext = (
  role: UserRole = UserRole.admin,
  tenantId: string = TENANT_A,
): Context => {
  const mockDb = {
    owner: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    property: {
      count: vi.fn(),
    },
    lease: {
      count: vi.fn(),
    },
    billingCharge: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    ownerAccount: {
      create: vi.fn(),
      findUnique: vi.fn(),
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

describe('ownerRouter', () => {
  describe('list', () => {
    it('permite todos os roles autenticados', async () => {
      const roles = [
        UserRole.admin,
        UserRole.financeiro,
        UserRole.operacional,
        UserRole.visualizador,
      ]

      for (const role of roles) {
        const ctx = createMockContext(role, TENANT_A)
        ;(ctx.db.owner.findMany as MockedFunction<any>).mockResolvedValue([])

        const caller = ownerRouter.createCaller(ctx) as any
        const result = await caller.list({ search: '', page: 1, limit: 10 })

        expect(result).toEqual([])
      }
    })

    it('filtra por busca de nome', async () => {
      const ctx = createMockContext(UserRole.admin, TENANT_A)
      const mockOwners = [
        {
          id: TEST_OWNER_ID,
          name: 'João Silva',
          cpfCnpj: '12345678901234',
          properties: [{ id: 'prop-1' }],
          ownerAccount: { balance: 5000 },
        },
      ]

      ;(ctx.db.owner.findMany as MockedFunction<any>).mockResolvedValue(mockOwners)

      const caller = ownerRouter.createCaller(ctx) as any
      const result = await caller.list({ search: 'João', page: 1, limit: 10 })

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('João Silva')
    })
  })

  describe('byId', () => {
    it('permite todos os roles autenticados', async () => {
      const roles = [
        UserRole.admin,
        UserRole.financeiro,
        UserRole.operacional,
        UserRole.visualizador,
      ]

      for (const role of roles) {
        const ctx = createMockContext(role, TENANT_A)
        const mockOwner = {
          id: TEST_OWNER_ID,
          name: 'João Silva',
          cpfCnpj: '12345678901234',
          properties: [{ id: 'prop-1', leases: [], address: 'Rua A' }],
          ownerAccount: { balance: 5000 },
        }

        // Mock $transaction to return array of [owner, totalProperties, activeLeases, pendingCharges]
        ;(ctx.db.$transaction as MockedFunction<any>).mockResolvedValue([mockOwner, 1, 0, 0])

        const caller = ownerRouter.createCaller(ctx) as any
        const result = await caller.byId({ id: TEST_OWNER_ID })

        expect(result.id).toBe(TEST_OWNER_ID)
      }
    })

    it('lança NOT_FOUND se proprietário não existe', async () => {
      const ctx = createMockContext(UserRole.admin, TENANT_A)
      // Mock $transaction to return null owner as first element
      ;(ctx.db.$transaction as MockedFunction<any>).mockResolvedValue([null, 0, 0, 0])

      const caller = ownerRouter.createCaller(ctx) as any

      try {
        await caller.byId({ id: TEST_OWNER_ID })
        expect.fail('Deveria ter lançado erro NOT_FOUND')
      } catch (error: any) {
        expect(error.code).toBe('NOT_FOUND')
      }
    })
  })

  describe('create', () => {
    it('permite admin, operacional e financeiro', async () => {
      const roles = [UserRole.admin, UserRole.operacional, UserRole.financeiro]

      for (const role of roles) {
        const ctx = createMockContext(role, TENANT_A)
        const mockOwner = { id: TEST_OWNER_ID, name: 'João Silva', cpfCnpj: '12345678901234' }

        const mockTx = {
          owner: { create: vi.fn().mockResolvedValue(mockOwner) },
          ownerAccount: { create: vi.fn().mockResolvedValue({}) },
        }
        ;(ctx.db.$transaction as MockedFunction<any>).mockImplementation((cb: any) => cb(mockTx))

        const caller = ownerRouter.createCaller(ctx) as any
        const result = await caller.create({
          name: 'João Silva',
          cpfCnpj: '12345678901234',
        })

        expect(result.id).toBe(TEST_OWNER_ID)
      }
    })

    it('rejeita visualizador', async () => {
      const ctx = createMockContext(UserRole.visualizador, TENANT_A)

      const caller = ownerRouter.createCaller(ctx) as any

      try {
        await caller.create({ name: 'João Silva', cpfCnpj: '12345678901234' })
        expect.fail('Deveria ter lançado erro FORBIDDEN')
      } catch (error: any) {
        expect(error.code).toBe('FORBIDDEN')
      }
    })
  })

  describe('update', () => {
    it('permite admin, operacional e financeiro', async () => {
      const roles = [UserRole.admin, UserRole.operacional, UserRole.financeiro]

      for (const role of roles) {
        const ctx = createMockContext(role, TENANT_A)
        const mockOwner = { id: TEST_OWNER_ID, name: 'João Silva', cpfCnpj: '12345678901234' }

        ;(ctx.db.owner.findUnique as MockedFunction<any>).mockResolvedValue(mockOwner)
        ;(ctx.db.owner.update as MockedFunction<any>).mockResolvedValue(mockOwner)

        const caller = ownerRouter.createCaller(ctx) as any
        const result = await caller.update({
          id: TEST_OWNER_ID,
          data: { name: 'João Silva Atualizado' },
        })

        expect(result.id).toBe(TEST_OWNER_ID)
      }
    })

    it('rejeita visualizador', async () => {
      const ctx = createMockContext(UserRole.visualizador, TENANT_A)

      const caller = ownerRouter.createCaller(ctx) as any

      try {
        await caller.update({ id: TEST_OWNER_ID, data: { name: 'João Silva Atualizado' } })
        expect.fail('Deveria ter lançado erro FORBIDDEN')
      } catch (error: any) {
        expect(error.code).toBe('FORBIDDEN')
      }
    })
  })

  describe('softDelete', () => {
    it('permite admin e operacional', async () => {
      const roles = [UserRole.admin, UserRole.operacional]

      for (const role of roles) {
        const ctx = createMockContext(role, TENANT_A)
        const mockOwner = { id: TEST_OWNER_ID, name: 'João Silva', properties: [] }

        ;(ctx.db.owner.findUnique as MockedFunction<any>).mockResolvedValue(mockOwner)
        ;(ctx.db.owner.update as MockedFunction<any>).mockResolvedValue(mockOwner)

        const caller = ownerRouter.createCaller(ctx) as any
        const result = await caller.softDelete({ id: TEST_OWNER_ID })

        expect(result.id).toBe(TEST_OWNER_ID)
      }
    })

    it('rejeita financeiro e visualizador', async () => {
      const roles = [UserRole.financeiro, UserRole.visualizador]

      for (const role of roles) {
        const ctx = createMockContext(role, TENANT_A)

        const caller = ownerRouter.createCaller(ctx) as any

        try {
          await caller.softDelete({ id: TEST_OWNER_ID })
          expect.fail(`Role ${role} deveria ter sido rejeitado`)
        } catch (error: any) {
          expect(error.code).toBe('FORBIDDEN')
        }
      }
    })

    it('lança PRECONDITION_FAILED se proprietário tem imóveis', async () => {
      const ctx = createMockContext(UserRole.admin, TENANT_A)
      const mockOwner = { id: TEST_OWNER_ID, name: 'João Silva', properties: [{ id: 'prop-1' }] }

      ;(ctx.db.owner.findUnique as MockedFunction<any>).mockResolvedValue(mockOwner)

      const caller = ownerRouter.createCaller(ctx) as any

      try {
        await caller.softDelete({ id: TEST_OWNER_ID })
        expect.fail('Deveria ter lançado erro PRECONDITION_FAILED')
      } catch (error: any) {
        expect(error.code).toBe('PRECONDITION_FAILED')
      }
    })
  })

  describe('statement', () => {
    it('permite todos os roles autenticados', async () => {
      const roles = [
        UserRole.admin,
        UserRole.financeiro,
        UserRole.operacional,
        UserRole.visualizador,
      ]

      for (const role of roles) {
        const ctx = createMockContext(role, TENANT_A)
        ;(ctx.db.billingCharge.findMany as MockedFunction<any>).mockResolvedValue([])

        const caller = ownerRouter.createCaller(ctx) as any
        const result = await caller.statement({
          ownerId: TEST_OWNER_ID,
          page: 1,
          limit: 10,
        })

        expect(result).toEqual([])
      }
    })
  })

  describe('balance', () => {
    it('permite todos os roles autenticados', async () => {
      const roles = [
        UserRole.admin,
        UserRole.financeiro,
        UserRole.operacional,
        UserRole.visualizador,
      ]

      for (const role of roles) {
        const ctx = createMockContext(role, TENANT_A)
        ;(ctx.db.ownerAccount.findUnique as MockedFunction<any>).mockResolvedValue({
          balance: 5000,
        })

        const caller = ownerRouter.createCaller(ctx) as any
        const result = await caller.balance({ ownerId: TEST_OWNER_ID })

        expect(result.balance).toBe(5000)
      }
    })

    it('retorna 0 se ownerAccount não existe', async () => {
      const ctx = createMockContext(UserRole.admin, TENANT_A)
      ;(ctx.db.ownerAccount.findUnique as MockedFunction<any>).mockResolvedValue(null)

      const caller = ownerRouter.createCaller(ctx) as any
      const result = await caller.balance({ ownerId: TEST_OWNER_ID })

      expect(result.balance).toBe(0)
    })
  })

  describe('RBAC Summary', () => {
    it('create: rejeita não-admin/não-operacional/não-financeiro', async () => {
      const roles = [UserRole.visualizador]

      for (const role of roles) {
        const ctx = createMockContext(role, TENANT_A)
        const caller = ownerRouter.createCaller(ctx) as any

        try {
          await caller.create({ name: 'João Silva', cpfCnpj: '12345678901234' })
          expect.fail(`Role ${role} deveria ter sido rejeitado`)
        } catch (error: any) {
          expect(error.code).toBe('FORBIDDEN')
        }
      }
    })

    it('update: rejeita visualizador', async () => {
      const ctx = createMockContext(UserRole.visualizador, TENANT_A)
      const caller = ownerRouter.createCaller(ctx) as any

      try {
        await caller.update({ id: TEST_OWNER_ID, data: { name: 'Updated' } })
        expect.fail('Role visualizador deveria ter sido rejeitado')
      } catch (error: any) {
        expect(error.code).toBe('FORBIDDEN')
      }
    })

    it('softDelete: rejeita financeiro e visualizador', async () => {
      const roles = [UserRole.financeiro, UserRole.visualizador]

      for (const role of roles) {
        const ctx = createMockContext(role, TENANT_A)
        const caller = ownerRouter.createCaller(ctx) as any

        try {
          await caller.softDelete({ id: TEST_OWNER_ID })
          expect.fail(`Role ${role} deveria ter sido rejeitado`)
        } catch (error: any) {
          expect(error.code).toBe('FORBIDDEN')
        }
      }
    })

    it('list e statement: permitem todos os roles', async () => {
      const roles = [
        UserRole.admin,
        UserRole.financeiro,
        UserRole.operacional,
        UserRole.visualizador,
      ]

      for (const role of roles) {
        const ctx = createMockContext(role, TENANT_A)
        ;(ctx.db.owner.findMany as MockedFunction<any>).mockResolvedValue([])
        ;(ctx.db.billingCharge.findMany as MockedFunction<any>).mockResolvedValue([])

        const caller = ownerRouter.createCaller(ctx) as any
        const listResult = await caller.list({ search: '', page: 1, limit: 10 })
        const stmtResult = await caller.statement({ ownerId: TEST_OWNER_ID, page: 1, limit: 10 })

        expect(listResult).toEqual([])
        expect(stmtResult).toEqual([])
      }
    })
  })
})
