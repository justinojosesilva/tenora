import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TRPCError } from '@trpc/server'
import { TenantStatus } from '@prisma/client'

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockGetAuth = vi.fn()
vi.mock('@clerk/fastify', () => ({ getAuth: mockGetAuth }))

const mockFindUnique = vi.fn()
const mockUserFindUnique = vi.fn()
const mockPrismaWithTenant = vi.fn()

vi.mock('@tenora/db', () => ({
  db: {
    tenant: { findUnique: mockFindUnique },
    user: { findUnique: mockUserFindUnique },
  },
  prismaWithTenant: mockPrismaWithTenant,
}))

// Import after mocks are set up
const { createContext } = await import('../context.js')

// ── Helpers ───────────────────────────────────────────────────────────────────

const fakeReq = {} as any
const fakeRes = {} as any
const opts = { req: fakeReq, res: fakeRes }

const activeTenant = {
  id: 'org_abc123',
  name: 'Imobiliária Central',
  slug: 'imobiliaria-central',
  status: TenantStatus.active,
}

const fakeUser = {
  id: 'user_db_1',
  name: 'Admin User',
  role: 'admin',
  tenantId: 'org_abc123',
}

const fakeTenantDb = { user: { findUnique: vi.fn() } }

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('createContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrismaWithTenant.mockReturnValue(fakeTenantDb)
  })

  it('retorna contexto público quando não há userId ou orgId', async () => {
    mockGetAuth.mockReturnValue({ userId: null, orgId: null })

    const ctx = await createContext(opts)

    expect(ctx.user).toBeNull()
    expect(ctx.tenantId).toBeNull()
    expect(mockPrismaWithTenant).not.toHaveBeenCalled()
  })

  it('retorna contexto público quando há userId mas não orgId', async () => {
    mockGetAuth.mockReturnValue({ userId: 'user_clerk_1', orgId: null })

    const ctx = await createContext(opts)

    expect(ctx.user).toBeNull()
    expect(ctx.tenantId).toBeNull()
  })

  it('retorna ctx.db como prismaWithTenant(orgId) para tenant válido', async () => {
    mockGetAuth.mockReturnValue({ userId: 'user_clerk_1', orgId: 'org_abc123' })
    fakeTenantDb.user.findUnique = vi.fn().mockResolvedValue(fakeUser)
    mockFindUnique.mockResolvedValue(activeTenant)

    const ctx = await createContext(opts)

    expect(mockPrismaWithTenant).toHaveBeenCalledWith('org_abc123')
    expect(ctx.db).toBe(fakeTenantDb)
    expect(ctx.tenantId).toBe('org_abc123')
    expect(ctx.user).toEqual(fakeUser)
  })

  it('lança UNAUTHORIZED quando usuário não existe no banco', async () => {
    mockGetAuth.mockReturnValue({ userId: 'user_clerk_1', orgId: 'org_abc123' })
    fakeTenantDb.user.findUnique = vi.fn().mockResolvedValue(null)

    await expect(createContext(opts)).rejects.toThrow(TRPCError)
    await expect(createContext(opts)).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
  })

  it('lança FORBIDDEN quando tenant está suspenso', async () => {
    mockGetAuth.mockReturnValue({ userId: 'user_clerk_1', orgId: 'org_abc123' })
    fakeTenantDb.user.findUnique = vi.fn().mockResolvedValue(fakeUser)
    mockFindUnique.mockResolvedValue({ ...activeTenant, status: TenantStatus.suspended })

    await expect(createContext(opts)).rejects.toThrow(TRPCError)
    await expect(createContext(opts)).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })

  it('lança FORBIDDEN quando tenant não existe na base', async () => {
    mockGetAuth.mockReturnValue({ userId: 'user_clerk_1', orgId: 'org_inexistente' })
    fakeTenantDb.user.findUnique = vi.fn().mockResolvedValue(fakeUser)
    mockFindUnique.mockResolvedValue(null)

    await expect(createContext(opts)).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })
})
