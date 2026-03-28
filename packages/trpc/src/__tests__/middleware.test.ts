import { describe, it, expect } from 'vitest'
import { TRPCError } from '@trpc/server'
import { UserRole } from '@prisma/client'
import { requireRole, isAuthed } from '../middleware'
import { t } from '../base'
import type { Context } from '../context'

// ── Test router ────────────────────────────────────────────────────────────────

const testRouter = t.router({
  authedAction: t.procedure.use(isAuthed).query(() => 'ok'),
  createProperty: t.procedure
    .use(isAuthed)
    .use(requireRole(UserRole.admin, UserRole.operacional, UserRole.financeiro))
    .query(() => 'created'),
  adminOnly: t.procedure
    .use(isAuthed)
    .use(requireRole(UserRole.admin))
    .query(() => 'admin-only'),
})

const createCaller = t.createCallerFactory(testRouter)

function makeCaller(role: UserRole | null) {
  const ctx: Context = role
    ? {
        user: { id: 'u1', name: 'Test', role, tenantId: 'org_1' },
        tenantId: 'org_1',
        db: {} as any,
        tenant: {} as any,
      }
    : { user: null, tenantId: null, db: {} as any }
  return createCaller(ctx)
}

// ── isAuthed ──────────────────────────────────────────────────────────────────

describe('isAuthed', () => {
  it('passa para qualquer usuário autenticado', async () => {
    const caller = makeCaller(UserRole.visualizador)
    await expect(caller.authedAction()).resolves.toBe('ok')
  })

  it('lança UNAUTHORIZED para usuário não autenticado', async () => {
    const caller = makeCaller(null)
    await expect(caller.authedAction()).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
    await expect(caller.authedAction()).rejects.toBeInstanceOf(TRPCError)
  })
})

// ── requireRole ───────────────────────────────────────────────────────────────

describe('requireRole', () => {
  it('admin pode criar imóvel', async () => {
    await expect(makeCaller(UserRole.admin).createProperty()).resolves.toBe('created')
  })

  it('operacional pode criar imóvel', async () => {
    await expect(makeCaller(UserRole.operacional).createProperty()).resolves.toBe('created')
  })

  it('financeiro pode criar imóvel', async () => {
    await expect(makeCaller(UserRole.financeiro).createProperty()).resolves.toBe('created')
  })

  it('VISUALIZADOR tentando criar imóvel retorna FORBIDDEN (403)', async () => {
    const caller = makeCaller(UserRole.visualizador)
    await expect(caller.createProperty()).rejects.toMatchObject({ code: 'FORBIDDEN' })
    await expect(caller.createProperty()).rejects.toBeInstanceOf(TRPCError)
  })

  it('sem autenticação retorna UNAUTHORIZED', async () => {
    const caller = makeCaller(null)
    await expect(caller.createProperty()).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
  })

  it('adminOnly bloqueia financeiro, operacional e visualizador', async () => {
    for (const role of [UserRole.financeiro, UserRole.operacional, UserRole.visualizador]) {
      await expect(makeCaller(role).adminOnly()).rejects.toMatchObject({ code: 'FORBIDDEN' })
    }
  })
})
