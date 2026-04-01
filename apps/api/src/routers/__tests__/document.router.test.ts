/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach, type MockedFunction } from 'vitest'
import { UserRole, type TenantStatus } from '@prisma/client'
import type { Context } from '@tenora/trpc'
import { documentRouter } from '../document.router'

const TEST_PROPERTY_ID = '550e8400-e29b-41d4-a716-446655440001'
const TEST_DOCUMENT_ID = '550e8400-e29b-41d4-a716-446655440002'
const TENANT_A = 'tenant-a-id'

// Create a mock context for testing
const createMockContext = (
  role: UserRole = UserRole.admin,
  tenantId: string = TENANT_A,
): Context => {
  const mockDb = {
    property: {
      findUnique: vi.fn(),
    },
    propertyDocument: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
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

describe('documentRouter', () => {
  // Setup env vars for document tests
  const originalEnv = { ...process.env }
  beforeEach(() => {
    process.env.R2_BUCKET_NAME = 'test-bucket'
    process.env.R2_PUBLIC_URL = 'https://example.com'
    process.env.R2_ACCOUNT_ID = 'test-account'
    process.env.R2_ACCESS_KEY_ID = 'test-key'
    process.env.R2_SECRET_ACCESS_KEY = 'test-secret'
  })
  afterEach(() => {
    process.env = { ...originalEnv }
  })

  describe('getUploadUrl', () => {
    it('permite admin, operacional e financeiro', async () => {
      const roles = [UserRole.admin, UserRole.operacional, UserRole.financeiro]

      for (const role of roles) {
        const ctx = createMockContext(role, TENANT_A)
        const mockProperty = { id: TEST_PROPERTY_ID, name: 'Test Property', deletedAt: null }
        const mockDocument = {
          id: TEST_DOCUMENT_ID,
          name: 'test.pdf',
          contentType: 'application/pdf',
          sizeBytes: 1000,
          storageKey: `${TENANT_A}/properties/${TEST_PROPERTY_ID}/${TEST_DOCUMENT_ID}.pdf`,
          url: `https://example.com/${TENANT_A}/properties/${TEST_PROPERTY_ID}/${TEST_DOCUMENT_ID}.pdf`,
        }

        ;(ctx.db.property.findUnique as MockedFunction<any>).mockResolvedValue(mockProperty)
        ;(ctx.db.propertyDocument.create as MockedFunction<any>).mockResolvedValue(mockDocument)

        const caller = documentRouter.createCaller(ctx) as any
        const result = await caller.getUploadUrl({
          propertyId: TEST_PROPERTY_ID,
          filename: 'test.pdf',
          contentType: 'application/pdf',
          sizeBytes: 1000,
        })

        expect(result.documentId).toBe(TEST_DOCUMENT_ID)
        expect(result).toHaveProperty('uploadUrl')
      }
    })

    it('rejeita visualizador', async () => {
      const ctx = createMockContext(UserRole.visualizador, TENANT_A)
      const caller = documentRouter.createCaller(ctx) as any

      try {
        await caller.getUploadUrl({
          propertyId: TEST_PROPERTY_ID,
          filename: 'test.pdf',
          contentType: 'application/pdf',
          sizeBytes: 1000,
        })
        expect.fail('Deveria ter lançado erro FORBIDDEN')
      } catch (error: any) {
        expect(error.code).toBe('FORBIDDEN')
      }
    })

    it('lança NOT_FOUND se imóvel não existe', async () => {
      const ctx = createMockContext(UserRole.admin, TENANT_A)
      ;(ctx.db.property.findUnique as MockedFunction<any>).mockResolvedValue(null)

      const caller = documentRouter.createCaller(ctx) as any

      try {
        await caller.getUploadUrl({
          propertyId: TEST_PROPERTY_ID,
          filename: 'test.pdf',
          contentType: 'application/pdf',
          sizeBytes: 1000,
        })
        expect.fail('Deveria ter lançado erro NOT_FOUND')
      } catch (error: any) {
        expect(error.code).toBe('NOT_FOUND')
      }
    })
  })

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
        const mockProperty = { id: TEST_PROPERTY_ID, name: 'Test Property', deletedAt: null }
        const mockDocuments = [
          {
            id: TEST_DOCUMENT_ID,
            name: 'test.pdf',
            contentType: 'application/pdf',
            sizeBytes: 1000,
            storageKey: `${TENANT_A}/properties/${TEST_PROPERTY_ID}/${TEST_DOCUMENT_ID}.pdf`,
            url: `https://example.com/${TENANT_A}/properties/${TEST_PROPERTY_ID}/${TEST_DOCUMENT_ID}.pdf`,
          },
        ]

        ;(ctx.db.property.findUnique as MockedFunction<any>).mockResolvedValue(mockProperty)
        ;(ctx.db.propertyDocument.findMany as MockedFunction<any>).mockResolvedValue(mockDocuments)

        const caller = documentRouter.createCaller(ctx) as any
        const result = await caller.list({ propertyId: TEST_PROPERTY_ID })

        expect(result).toHaveLength(1)
        expect(result[0].id).toBe(TEST_DOCUMENT_ID)
      }
    })

    it('lança NOT_FOUND se imóvel não existe', async () => {
      const ctx = createMockContext(UserRole.admin, TENANT_A)
      ;(ctx.db.property.findUnique as MockedFunction<any>).mockResolvedValue(null)

      const caller = documentRouter.createCaller(ctx) as any

      try {
        await caller.list({ propertyId: TEST_PROPERTY_ID })
        expect.fail('Deveria ter lançado erro NOT_FOUND')
      } catch (error: any) {
        expect(error.code).toBe('NOT_FOUND')
      }
    })
  })

  describe('delete', () => {
    it('permite admin e operacional', async () => {
      const roles = [UserRole.admin, UserRole.operacional]

      for (const role of roles) {
        const ctx = createMockContext(role, TENANT_A)
        const mockDocument = {
          id: TEST_DOCUMENT_ID,
          name: 'test.pdf',
          contentType: 'application/pdf',
          sizeBytes: 1000,
          storageKey: `${TENANT_A}/properties/${TEST_PROPERTY_ID}/${TEST_DOCUMENT_ID}.pdf`,
          url: `https://example.com/${TENANT_A}/properties/${TEST_PROPERTY_ID}/${TEST_DOCUMENT_ID}.pdf`,
        }

        ;(ctx.db.propertyDocument.findUnique as MockedFunction<any>).mockResolvedValue(mockDocument)
        ;(ctx.db.propertyDocument.delete as MockedFunction<any>).mockResolvedValue(mockDocument)

        const caller = documentRouter.createCaller(ctx) as any
        const result = await caller.delete({ documentId: TEST_DOCUMENT_ID })

        expect(result.deleted).toBe(true)
      }
    })

    it('rejeita financeiro e visualizador', async () => {
      const roles = [UserRole.financeiro, UserRole.visualizador]

      for (const role of roles) {
        const ctx = createMockContext(role, TENANT_A)
        const caller = documentRouter.createCaller(ctx) as any

        try {
          await caller.delete({ documentId: TEST_DOCUMENT_ID })
          expect.fail(`Role ${role} deveria ter sido rejeitado`)
        } catch (error: any) {
          expect(error.code).toBe('FORBIDDEN')
        }
      }
    })

    it('lança NOT_FOUND se documento não existe', async () => {
      const ctx = createMockContext(UserRole.admin, TENANT_A)
      ;(ctx.db.propertyDocument.findUnique as MockedFunction<any>).mockResolvedValue(null)

      const caller = documentRouter.createCaller(ctx) as any

      try {
        await caller.delete({ documentId: TEST_DOCUMENT_ID })
        expect.fail('Deveria ter lançado erro NOT_FOUND')
      } catch (error: any) {
        expect(error.code).toBe('NOT_FOUND')
      }
    })
  })

  describe('RBAC Summary', () => {
    it('getUploadUrl: rejeita visualizador', async () => {
      const ctx = createMockContext(UserRole.visualizador, TENANT_A)
      const caller = documentRouter.createCaller(ctx) as any

      try {
        await caller.getUploadUrl({
          propertyId: TEST_PROPERTY_ID,
          filename: 'test.pdf',
          contentType: 'application/pdf',
          sizeBytes: 1000,
        })
        expect.fail('Role visualizador deveria ter sido rejeitado')
      } catch (error: any) {
        expect(error.code).toBe('FORBIDDEN')
      }
    })

    it('delete: rejeita financeiro e visualizador', async () => {
      const roles = [UserRole.financeiro, UserRole.visualizador]

      for (const role of roles) {
        const ctx = createMockContext(role, TENANT_A)
        const caller = documentRouter.createCaller(ctx) as any

        try {
          await caller.delete({ documentId: TEST_DOCUMENT_ID })
          expect.fail(`Role ${role} deveria ter sido rejeitado`)
        } catch (error: any) {
          expect(error.code).toBe('FORBIDDEN')
        }
      }
    })

    it('list: permite todos os roles', async () => {
      const roles = [
        UserRole.admin,
        UserRole.financeiro,
        UserRole.operacional,
        UserRole.visualizador,
      ]

      for (const role of roles) {
        const ctx = createMockContext(role, TENANT_A)
        const mockProperty = { id: TEST_PROPERTY_ID, name: 'Test Property', deletedAt: null }
        ;(ctx.db.property.findUnique as MockedFunction<any>).mockResolvedValue(mockProperty)
        ;(ctx.db.propertyDocument.findMany as MockedFunction<any>).mockResolvedValue([])

        const caller = documentRouter.createCaller(ctx) as any
        const result = await caller.list({ propertyId: TEST_PROPERTY_ID })

        expect(result).toEqual([])
      }
    })
  })
})
