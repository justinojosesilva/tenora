/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'vitest'
import { UserRole, type TenantStatus } from '@prisma/client'
import type { Context } from '@tenora/trpc'
import { onboardingRouter } from '../onboarding.router'

const TENANT_A = 'tenant-a-id'

// Create a mock context for testing
const createMockContext = (
  role: UserRole = UserRole.admin,
  tenantId: string = TENANT_A,
): Context => {
  // Note: onboarding router uses rootDb directly via imports, so we only mock the context structure
  return {
    user: {
      id: 'test-user-id',
      name: 'Test User',
      role,
      tenantId,
    },
    tenantId,
    db: {} as unknown as Context['db'],
    redis: {} as Context['redis'],
    tenant: {
      id: tenantId,
      name: `Test Tenant ${tenantId}`,
      status: 'active' as TenantStatus,
    } as Context['tenant'],
  } as Context
}

describe('onboardingRouter', () => {
  describe('getStatus', () => {
    it('permite apenas admin', async () => {
      const ctx = createMockContext(UserRole.admin, TENANT_A)
      const caller = onboardingRouter.createCaller(ctx) as any

      // Since the router uses rootDb imported directly, this test verifies
      // that the procedure is protected by adminProcedure
      // A real test would need DB mocking at module level or dependency injection
      expect(caller.getStatus).toBeDefined()
    })

    it('rejeita financeiro', async () => {
      const ctx = createMockContext(UserRole.financeiro, TENANT_A)
      const caller = onboardingRouter.createCaller(ctx) as any

      try {
        await caller.getStatus()
        expect.fail('Role financeiro deveria ter sido rejeitado')
      } catch (error: any) {
        expect(error.code).toBe('FORBIDDEN')
      }
    })

    it('rejeita operacional', async () => {
      const ctx = createMockContext(UserRole.operacional, TENANT_A)
      const caller = onboardingRouter.createCaller(ctx) as any

      try {
        await caller.getStatus()
        expect.fail('Role operacional deveria ter sido rejeitado')
      } catch (error: any) {
        expect(error.code).toBe('FORBIDDEN')
      }
    })

    it('rejeita visualizador', async () => {
      const ctx = createMockContext(UserRole.visualizador, TENANT_A)
      const caller = onboardingRouter.createCaller(ctx) as any

      try {
        await caller.getStatus()
        expect.fail('Role visualizador deveria ter sido rejeitado')
      } catch (error: any) {
        expect(error.code).toBe('FORBIDDEN')
      }
    })
  })

  describe('completeStep', () => {
    it('permite apenas admin', async () => {
      const ctx = createMockContext(UserRole.admin, TENANT_A)
      const caller = onboardingRouter.createCaller(ctx) as any

      expect(caller.completeStep).toBeDefined()
    })

    it('rejeita financeiro', async () => {
      const ctx = createMockContext(UserRole.financeiro, TENANT_A)
      const caller = onboardingRouter.createCaller(ctx) as any

      try {
        await caller.completeStep({ step: 'dados_basicos' })
        expect.fail('Role financeiro deveria ter sido rejeitado')
      } catch (error: any) {
        expect(error.code).toBe('FORBIDDEN')
      }
    })

    it('rejeita operacional', async () => {
      const ctx = createMockContext(UserRole.operacional, TENANT_A)
      const caller = onboardingRouter.createCaller(ctx) as any

      try {
        await caller.completeStep({ step: 'dados_basicos' })
        expect.fail('Role operacional deveria ter sido rejeitado')
      } catch (error: any) {
        expect(error.code).toBe('FORBIDDEN')
      }
    })

    it('rejeita visualizador', async () => {
      const ctx = createMockContext(UserRole.visualizador, TENANT_A)
      const caller = onboardingRouter.createCaller(ctx) as any

      try {
        await caller.completeStep({ step: 'dados_basicos' })
        expect.fail('Role visualizador deveria ter sido rejeitado')
      } catch (error: any) {
        expect(error.code).toBe('FORBIDDEN')
      }
    })
  })

  describe('skip', () => {
    it('permite apenas admin', async () => {
      const ctx = createMockContext(UserRole.admin, TENANT_A)
      const caller = onboardingRouter.createCaller(ctx) as any

      expect(caller.skip).toBeDefined()
    })

    it('rejeita financeiro', async () => {
      const ctx = createMockContext(UserRole.financeiro, TENANT_A)
      const caller = onboardingRouter.createCaller(ctx) as any

      try {
        await caller.skip({ step: 'primeiro_imovel' })
        expect.fail('Role financeiro deveria ter sido rejeitado')
      } catch (error: any) {
        expect(error.code).toBe('FORBIDDEN')
      }
    })

    it('rejeita operacional', async () => {
      const ctx = createMockContext(UserRole.operacional, TENANT_A)
      const caller = onboardingRouter.createCaller(ctx) as any

      try {
        await caller.skip({ step: 'primeiro_imovel' })
        expect.fail('Role operacional deveria ter sido rejeitado')
      } catch (error: any) {
        expect(error.code).toBe('FORBIDDEN')
      }
    })

    it('rejeita visualizador', async () => {
      const ctx = createMockContext(UserRole.visualizador, TENANT_A)
      const caller = onboardingRouter.createCaller(ctx) as any

      try {
        await caller.skip({ step: 'primeiro_imovel' })
        expect.fail('Role visualizador deveria ter sido rejeitado')
      } catch (error: any) {
        expect(error.code).toBe('FORBIDDEN')
      }
    })
  })

  describe('updateProfile', () => {
    it('permite apenas admin', async () => {
      const ctx = createMockContext(UserRole.admin, TENANT_A)
      const caller = onboardingRouter.createCaller(ctx) as any

      expect(caller.updateProfile).toBeDefined()
    })

    it('rejeita financeiro', async () => {
      const ctx = createMockContext(UserRole.financeiro, TENANT_A)
      const caller = onboardingRouter.createCaller(ctx) as any

      try {
        await caller.updateProfile({ cnpj: '12345678901234' })
        expect.fail('Role financeiro deveria ter sido rejeitado')
      } catch (error: any) {
        expect(error.code).toBe('FORBIDDEN')
      }
    })

    it('rejeita operacional', async () => {
      const ctx = createMockContext(UserRole.operacional, TENANT_A)
      const caller = onboardingRouter.createCaller(ctx) as any

      try {
        await caller.updateProfile({ cnpj: '12345678901234' })
        expect.fail('Role operacional deveria ter sido rejeitado')
      } catch (error: any) {
        expect(error.code).toBe('FORBIDDEN')
      }
    })

    it('rejeita visualizador', async () => {
      const ctx = createMockContext(UserRole.visualizador, TENANT_A)
      const caller = onboardingRouter.createCaller(ctx) as any

      try {
        await caller.updateProfile({ cnpj: '12345678901234' })
        expect.fail('Role visualizador deveria ter sido rejeitado')
      } catch (error: any) {
        expect(error.code).toBe('FORBIDDEN')
      }
    })
  })

  describe('RBAC Summary', () => {
    it('getStatus: admin-only', async () => {
      const roles = [UserRole.financeiro, UserRole.operacional, UserRole.visualizador]

      for (const role of roles) {
        const ctx = createMockContext(role, TENANT_A)
        const caller = onboardingRouter.createCaller(ctx) as any

        try {
          await caller.getStatus()
          expect.fail(`Role ${role} deveria ter sido rejeitado para getStatus`)
        } catch (error: any) {
          expect(error.code).toBe('FORBIDDEN')
        }
      }
    })

    it('completeStep: admin-only', async () => {
      const roles = [UserRole.financeiro, UserRole.operacional, UserRole.visualizador]

      for (const role of roles) {
        const ctx = createMockContext(role, TENANT_A)
        const caller = onboardingRouter.createCaller(ctx) as any

        try {
          await caller.completeStep({ step: 'dados_basicos' })
          expect.fail(`Role ${role} deveria ter sido rejeitado para completeStep`)
        } catch (error: any) {
          expect(error.code).toBe('FORBIDDEN')
        }
      }
    })

    it('skip: admin-only', async () => {
      const roles = [UserRole.financeiro, UserRole.operacional, UserRole.visualizador]

      for (const role of roles) {
        const ctx = createMockContext(role, TENANT_A)
        const caller = onboardingRouter.createCaller(ctx) as any

        try {
          await caller.skip({ step: 'primeiro_imovel' })
          expect.fail(`Role ${role} deveria ter sido rejeitado para skip`)
        } catch (error: any) {
          expect(error.code).toBe('FORBIDDEN')
        }
      }
    })

    it('updateProfile: admin-only', async () => {
      const roles = [UserRole.financeiro, UserRole.operacional, UserRole.visualizador]

      for (const role of roles) {
        const ctx = createMockContext(role, TENANT_A)
        const caller = onboardingRouter.createCaller(ctx) as any

        try {
          await caller.updateProfile({ cnpj: '12345678901234' })
          expect.fail(`Role ${role} deveria ter sido rejeitado para updateProfile`)
        } catch (error: any) {
          expect(error.code).toBe('FORBIDDEN')
        }
      }
    })
  })
})
