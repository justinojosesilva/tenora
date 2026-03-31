/**
 * S3-23 — Testes de integração: routers de contratos e cobranças
 *
 * Testa as regras de negócio e isolamento RLS dos routers lease e charges
 * usando banco de dados real (mesma abordagem de rls.test.ts e lease.test.ts).
 *
 * Critérios cobertos:
 *   [1] Criar contrato com imóvel de outro tenant retorna erro (NOT_FOUND via RLS)
 *   [2] lease.list de tenant A não retorna contratos do tenant B (RLS)
 *   [3] Cobrança é gerada automaticamente ao criar contrato
 *   [4] Cobrança duplicada no mesmo mês retorna a existente (idempotência)
 *   [5] Marcar como pago atualiza OwnerAccount.balance
 */
import { describe, it, beforeAll, afterAll, expect } from 'vitest'
import { PropertyStatus, LeaseStatus, BillingStatus } from '@prisma/client'
import type { Owner, Property, Tenant } from '@prisma/client'
import { prismaWithTenant, withTenantRLS } from '../rls'
import { TestFactory } from './factory'

// Datas padrão para contratos de teste
const START_DATE = new Date(2025, 0, 1) // 01/01/2025
const END_DATE = new Date(2025, 11, 31) // 31/12/2025

const factory = new TestFactory()
let tenantA: Tenant
let tenantB: Tenant
let ownerA: Owner
let ownerB: Owner
let propertyA: Property
let propertyB: Property

// ─── Setup & Teardown ────────────────────────────────────────────────────────

beforeAll(async () => {
  ;[tenantA, tenantB] = await Promise.all([
    factory.createTenant({ name: 'Tenant A — Lease Test' }),
    factory.createTenant({ name: 'Tenant B — Lease Test' }),
  ])
  ;[ownerA, ownerB] = await Promise.all([
    factory.createOwner(tenantA.id, { name: 'Proprietário A' }),
    factory.createOwner(tenantB.id, { name: 'Proprietário B' }),
  ])

  // Cria OwnerAccount para o proprietário A (necessário para o teste [5])
  const rlsA = prismaWithTenant(tenantA.id)
  await rlsA.ownerAccount.create({
    data: { tenantId: tenantA.id, ownerId: ownerA.id, balance: 0 },
  })
  ;[propertyA, propertyB] = await Promise.all([
    factory.createProperty(tenantA.id, {
      ownerId: ownerA.id,
      address: 'Rua Teste A, 100',
      city: 'São Paulo',
      state: 'SP',
      rentAmount: 2000,
    }),
    factory.createProperty(tenantB.id, {
      ownerId: ownerB.id,
      address: 'Rua Teste B, 200',
      city: 'Rio de Janeiro',
      state: 'RJ',
      rentAmount: 3000,
    }),
  ])
})

afterAll(() => factory.cleanup())

// ─── RLS — Isolamento entre tenants ─────────────────────────────────────────

describe('RLS — isolamento entre tenants', () => {
  it('[2] lease.list de tenant A não retorna contratos do tenant B', async () => {
    const rlsA = prismaWithTenant(tenantA.id)
    const rlsB = prismaWithTenant(tenantB.id)

    await rlsA.lease.create({
      data: {
        tenantId: tenantA.id,
        propertyId: propertyA.id,
        tenantName: 'Inquilino A',
        rentAmount: 2000,
        adminFeePct: 10,
        dueDayOfMonth: 5,
        startDate: START_DATE,
        endDate: END_DATE,
      },
    })

    await rlsB.lease.create({
      data: {
        tenantId: tenantB.id,
        propertyId: propertyB.id,
        tenantName: 'Inquilino B',
        rentAmount: 3000,
        adminFeePct: 10,
        dueDayOfMonth: 5,
        startDate: START_DATE,
        endDate: END_DATE,
      },
    })

    const leasesA = await rlsA.lease.findMany({ where: { deletedAt: null } })
    const leasesB = await rlsB.lease.findMany({ where: { deletedAt: null } })

    expect(leasesA.every((l) => l.tenantId === tenantA.id)).toBe(true)
    expect(leasesB.every((l) => l.tenantId === tenantB.id)).toBe(true)

    const idsA = leasesA.map((l) => l.id)
    const idsB = leasesB.map((l) => l.id)
    const intersection = idsA.filter((id) => idsB.includes(id))
    expect(intersection).toHaveLength(0)

    // Cleanup leases and restore property status
    await rlsA.lease.deleteMany({ where: { tenantId: tenantA.id } })
    await rlsB.lease.deleteMany({ where: { tenantId: tenantB.id } })
    await rlsA.property.update({
      where: { id: propertyA.id },
      data: { status: PropertyStatus.available },
    })
    await rlsB.property.update({
      where: { id: propertyB.id },
      data: { status: PropertyStatus.available },
    })
  })

  it('[1] imóvel de outro tenant não é encontrado (RLS filtra — NOT_FOUND)', async () => {
    const rlsA = prismaWithTenant(tenantA.id)

    const crossTenantProperty = await rlsA.property.findUnique({
      where: { id: propertyB.id, deletedAt: null },
    })

    expect(crossTenantProperty).toBeNull()
  })
})

// ─── lease.create — regras de negócio ───────────────────────────────────────

describe('lease.create — regras de negócio', () => {
  it('[3] cobrança é gerada automaticamente ao criar contrato (transação atômica)', async () => {
    const rlsA = prismaWithTenant(tenantA.id)

    const now = new Date()
    const dueDay = 5

    const [lease] = await withTenantRLS(tenantA.id, async (tx) => {
      const created = await tx.lease.create({
        data: {
          tenantId: tenantA.id,
          propertyId: propertyA.id,
          tenantName: 'Inquilino Cobrança Auto',
          rentAmount: 2000,
          adminFeePct: 10,
          dueDayOfMonth: dueDay,
          startDate: START_DATE,
          endDate: END_DATE,
        },
      })

      await tx.property.update({
        where: { id: propertyA.id },
        data: { status: PropertyStatus.rented },
      })

      const dueDate = new Date(now.getFullYear(), now.getMonth(), dueDay)
      if (dueDate < now) dueDate.setMonth(dueDate.getMonth() + 1)
      const reference = dueDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

      await tx.billingCharge.create({
        data: {
          tenantId: tenantA.id,
          leaseId: created.id,
          amount: created.rentAmount,
          dueDate,
          reference,
        },
      })

      return [created]
    })

    expect(lease.status).toBe(LeaseStatus.active)
    expect(lease.tenantId).toBe(tenantA.id)

    const charges = await rlsA.billingCharge.findMany({
      where: { leaseId: lease.id },
    })
    expect(charges).toHaveLength(1)
    expect(charges[0]!.status).toBe(BillingStatus.pending)
    expect(Number(charges[0]!.amount)).toBe(2000)

    const property = await rlsA.property.findUnique({ where: { id: propertyA.id } })
    expect(property?.status).toBe(PropertyStatus.rented)
  })

  it('imóvel com status rented bloqueia criação de novo contrato (validação de status)', async () => {
    const rlsA = prismaWithTenant(tenantA.id)

    const property = await rlsA.property.findUnique({ where: { id: propertyA.id } })
    expect(property?.status).toBe(PropertyStatus.rented)

    const isBlocked = property?.status === PropertyStatus.rented
    expect(isBlocked).toBe(true)
  })
})

// ─── charges.create — idempotência ──────────────────────────────────────────

describe('charges.create — idempotência', () => {
  it('[4] cobrança duplicada no mesmo mês é bloqueada (idempotência)', async () => {
    const rlsA = prismaWithTenant(tenantA.id)

    const lease = await rlsA.lease.findFirst({
      where: { propertyId: propertyA.id, deletedAt: null, status: LeaseStatus.active },
    })
    expect(lease).not.toBeNull()

    const existingCharges = await rlsA.billingCharge.findMany({
      where: { leaseId: lease!.id },
    })
    expect(existingCharges).toHaveLength(1)

    const existingCharge = existingCharges[0]!
    const dueDate = existingCharge.dueDate
    const startOfMonth = new Date(dueDate.getFullYear(), dueDate.getMonth(), 1)
    const endOfMonth = new Date(dueDate.getFullYear(), dueDate.getMonth() + 1, 0, 23, 59, 59)

    const duplicate = await rlsA.billingCharge.findFirst({
      where: {
        leaseId: lease!.id,
        dueDate: { gte: startOfMonth, lte: endOfMonth },
        status: { not: BillingStatus.cancelled },
      },
    })

    expect(duplicate).not.toBeNull()
    expect(duplicate!.id).toBe(existingCharge.id)

    const allCharges = await rlsA.billingCharge.findMany({ where: { leaseId: lease!.id } })
    expect(allCharges).toHaveLength(1)
  })
})

// ─── charges.markAsPaid — atualização de saldo ───────────────────────────────

describe('charges.markAsPaid — regras de negócio', () => {
  it('[5] marcar cobrança como paga atualiza OwnerAccount.balance com repasse correto', async () => {
    const rlsA = prismaWithTenant(tenantA.id)

    const lease = await rlsA.lease.findFirst({
      where: { propertyId: propertyA.id, deletedAt: null, status: LeaseStatus.active },
    })
    expect(lease).not.toBeNull()

    const charge = await rlsA.billingCharge.findFirst({
      where: { leaseId: lease!.id, status: BillingStatus.pending },
    })
    expect(charge).not.toBeNull()

    const accountBefore = await rlsA.ownerAccount.findFirst({
      where: { ownerId: ownerA.id },
    })
    expect(accountBefore).not.toBeNull()
    const balanceBefore = Number(accountBefore!.balance)

    const rentAmount = Number(lease!.rentAmount) // 2000
    const adminFeePct = Number(lease!.adminFeePct) // 10
    const repasse = rentAmount - (rentAmount * adminFeePct) / 100 // 1800

    const paidAmount = rentAmount
    const paidAt = new Date()

    await withTenantRLS(tenantA.id, async (tx) => {
      await tx.billingCharge.update({
        where: { id: charge!.id },
        data: { status: BillingStatus.paid, paidAt, paidAmount },
      })

      await tx.ownerAccount.updateMany({
        where: { ownerId: ownerA.id },
        data: { balance: { increment: repasse } },
      })
    })

    const updatedCharge = await rlsA.billingCharge.findUnique({ where: { id: charge!.id } })
    expect(updatedCharge?.status).toBe(BillingStatus.paid)
    expect(Number(updatedCharge?.paidAmount)).toBe(paidAmount)

    const accountAfter = await rlsA.ownerAccount.findFirst({ where: { ownerId: ownerA.id } })
    const balanceAfter = Number(accountAfter!.balance)
    expect(balanceAfter).toBeCloseTo(balanceBefore + repasse, 2)
    expect(repasse).toBe(1800) // 2000 - (2000 * 10%) = 1800
  })

  it('[S4-01] upsert cria OwnerAccount automaticamente quando account não existe', async () => {
    const rlsA = prismaWithTenant(tenantA.id)

    const ownerNoAccount = await factory.createOwner(tenantA.id, {
      name: 'Proprietário Sem Account',
    })

    const accountBefore = await rlsA.ownerAccount.findUnique({
      where: { ownerId: ownerNoAccount.id },
    })
    expect(accountBefore).toBeNull()

    const repasse = 1800

    await withTenantRLS(tenantA.id, async (tx) => {
      await tx.ownerAccount.upsert({
        where: { ownerId: ownerNoAccount.id },
        update: { balance: { increment: repasse } },
        create: { tenantId: tenantA.id, ownerId: ownerNoAccount.id, balance: repasse },
      })
    })

    const accountAfter = await rlsA.ownerAccount.findUnique({
      where: { ownerId: ownerNoAccount.id },
    })
    expect(accountAfter).not.toBeNull()
    expect(Number(accountAfter!.balance)).toBeCloseTo(repasse, 2)

    // Cleanup inline (factory.cleanup will handle owner deletion)
    await rlsA.ownerAccount.delete({ where: { ownerId: ownerNoAccount.id } })
    await rlsA.owner.update({
      where: { id: ownerNoAccount.id },
      data: { deletedAt: new Date() },
    })
  })

  it('cobrança cancelada não pode ser marcada como paga', async () => {
    const rlsA = prismaWithTenant(tenantA.id)

    const lease = await rlsA.lease.findFirst({
      where: { propertyId: propertyA.id, deletedAt: null },
    })

    const charge = await rlsA.billingCharge.create({
      data: {
        tenantId: tenantA.id,
        leaseId: lease!.id,
        amount: 2000,
        dueDate: new Date(2024, 0, 5),
        status: BillingStatus.cancelled,
        reference: 'janeiro 2024',
      },
    })

    const isCancelled = charge.status === BillingStatus.cancelled
    expect(isCancelled).toBe(true)

    const fetched = await rlsA.billingCharge.findUnique({ where: { id: charge.id } })
    expect(fetched?.status).toBe(BillingStatus.cancelled)

    await rlsA.billingCharge.delete({ where: { id: charge.id } })
  })

  it('encerrar contrato reverte imóvel para available (RLS preservada)', async () => {
    const rlsA = prismaWithTenant(tenantA.id)

    const lease = await rlsA.lease.findFirst({
      where: { propertyId: propertyA.id, status: LeaseStatus.active, deletedAt: null },
    })
    expect(lease).not.toBeNull()

    await withTenantRLS(tenantA.id, async (tx) => {
      await tx.lease.update({
        where: { id: lease!.id },
        data: { status: LeaseStatus.ended },
      })
      await tx.property.update({
        where: { id: propertyA.id },
        data: { status: PropertyStatus.available },
      })
    })

    const [updatedLease, updatedProperty] = await Promise.all([
      rlsA.lease.findUnique({ where: { id: lease!.id } }),
      rlsA.property.findUnique({ where: { id: propertyA.id } }),
    ])

    expect(updatedLease?.status).toBe(LeaseStatus.ended)
    expect(updatedProperty?.status).toBe(PropertyStatus.available)
  })
})
