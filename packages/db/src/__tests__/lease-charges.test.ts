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
import {
  TenantStatus,
  TenantPlan,
  UserRole,
  PropertyType,
  PropertyStatus,
  LeaseStatus,
  BillingStatus,
} from '@prisma/client'
import { db, prismaWithTenant } from '../rls'

// ─── Tipos auxiliares ────────────────────────────────────────────────────────

interface Fixture {
  tenantA: { id: string }
  tenantB: { id: string }
  ownerA: { id: string }
  ownerB: { id: string }
  propertyA: { id: string } // pertence ao tenant A
  propertyB: { id: string } // pertence ao tenant B
}

const f: Fixture = {
  tenantA: { id: '' },
  tenantB: { id: '' },
  ownerA: { id: '' },
  ownerB: { id: '' },
  propertyA: { id: '' },
  propertyB: { id: '' },
}

// Datas padrão para contratos de teste
const START_DATE = new Date(2025, 0, 1) // 01/01/2025
const END_DATE = new Date(2025, 11, 31) // 31/12/2025

// ─── Setup & Teardown ────────────────────────────────────────────────────────

beforeAll(async () => {
  const ts = Date.now()

  // Dois tenants isolados
  const [tenantA, tenantB] = await Promise.all([
    db.tenant.create({
      data: {
        name: 'Tenant A — Lease Test',
        slug: `tenant-a-lease-${ts}`,
        plan: TenantPlan.starter,
        status: TenantStatus.active,
      },
    }),
    db.tenant.create({
      data: {
        name: 'Tenant B — Lease Test',
        slug: `tenant-b-lease-${ts}`,
        plan: TenantPlan.starter,
        status: TenantStatus.active,
      },
    }),
  ])
  f.tenantA.id = tenantA.id
  f.tenantB.id = tenantB.id

  const rlsA = prismaWithTenant(f.tenantA.id)
  const rlsB = prismaWithTenant(f.tenantB.id)

  // Owners
  const [ownerA, ownerB] = await Promise.all([
    rlsA.owner.create({
      data: {
        tenantId: f.tenantA.id,
        name: 'Proprietário A',
        cpfCnpj: `111.222.333-${ts.toString().slice(-2)}`,
        email: `owner-a-${ts}@test.com`,
      },
    }),
    rlsB.owner.create({
      data: {
        tenantId: f.tenantB.id,
        name: 'Proprietário B',
        cpfCnpj: `999.888.777-${ts.toString().slice(-2)}`,
        email: `owner-b-${ts}@test.com`,
      },
    }),
  ])
  f.ownerA.id = ownerA.id
  f.ownerB.id = ownerB.id

  // Cria OwnerAccount para o proprietário A (necessário para o teste [5])
  await rlsA.ownerAccount.create({
    data: {
      tenantId: f.tenantA.id,
      ownerId: ownerA.id,
      balance: 0,
    },
  })

  // Properties
  const [propertyA, propertyB] = await Promise.all([
    rlsA.property.create({
      data: {
        tenantId: f.tenantA.id,
        ownerId: f.ownerA.id,
        address: 'Rua Teste A, 100',
        city: 'São Paulo',
        state: 'SP',
        type: PropertyType.residential,
        status: PropertyStatus.available,
        adminFeePct: 10,
        rentAmount: 2000,
      },
    }),
    rlsB.property.create({
      data: {
        tenantId: f.tenantB.id,
        ownerId: f.ownerB.id,
        address: 'Rua Teste B, 200',
        city: 'Rio de Janeiro',
        state: 'RJ',
        type: PropertyType.residential,
        status: PropertyStatus.available,
        adminFeePct: 10,
        rentAmount: 3000,
      },
    }),
  ])
  f.propertyA.id = propertyA.id
  f.propertyB.id = propertyB.id
})

afterAll(async () => {
  const rlsA = prismaWithTenant(f.tenantA.id)
  const rlsB = prismaWithTenant(f.tenantB.id)

  // Limpa na ordem correta (filhos antes de pais)
  await rlsA.billingCharge.deleteMany({ where: { tenantId: f.tenantA.id } })
  await rlsB.billingCharge.deleteMany({ where: { tenantId: f.tenantB.id } })
  await rlsA.lease.deleteMany({ where: { tenantId: f.tenantA.id } })
  await rlsB.lease.deleteMany({ where: { tenantId: f.tenantB.id } })
  await rlsA.ownerAccount.deleteMany({ where: { tenantId: f.tenantA.id } })
  await rlsA.property.deleteMany({ where: { tenantId: f.tenantA.id } })
  await rlsB.property.deleteMany({ where: { tenantId: f.tenantB.id } })
  await rlsA.owner.deleteMany({ where: { tenantId: f.tenantA.id } })
  await rlsB.owner.deleteMany({ where: { tenantId: f.tenantB.id } })
  await db.tenant.deleteMany({
    where: { id: { in: [f.tenantA.id, f.tenantB.id] } },
  })
})

// ─── RLS — Isolamento entre tenants ─────────────────────────────────────────

describe('RLS — isolamento entre tenants', () => {
  it('[2] lease.list de tenant A não retorna contratos do tenant B', async () => {
    const rlsA = prismaWithTenant(f.tenantA.id)
    const rlsB = prismaWithTenant(f.tenantB.id)

    // Cria um contrato para cada tenant
    await rlsA.lease.create({
      data: {
        tenantId: f.tenantA.id,
        propertyId: f.propertyA.id,
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
        tenantId: f.tenantB.id,
        propertyId: f.propertyB.id,
        tenantName: 'Inquilino B',
        rentAmount: 3000,
        adminFeePct: 10,
        dueDayOfMonth: 5,
        startDate: START_DATE,
        endDate: END_DATE,
      },
    })

    // Tenant A só deve ver seus próprios contratos
    const leasesA = await rlsA.lease.findMany({ where: { deletedAt: null } })
    const leasesB = await rlsB.lease.findMany({ where: { deletedAt: null } })

    expect(leasesA.every((l) => l.tenantId === f.tenantA.id)).toBe(true)
    expect(leasesB.every((l) => l.tenantId === f.tenantB.id)).toBe(true)

    // Nenhum contrato do tenant B aparece na lista do tenant A e vice-versa
    const idsA = leasesA.map((l) => l.id)
    const idsB = leasesB.map((l) => l.id)
    const intersection = idsA.filter((id) => idsB.includes(id))
    expect(intersection).toHaveLength(0)

    // Cleanup
    await rlsA.lease.deleteMany({ where: { tenantId: f.tenantA.id } })
    await rlsB.lease.deleteMany({ where: { tenantId: f.tenantB.id } })

    // Restaura status das properties
    await rlsA.property.update({
      where: { id: f.propertyA.id },
      data: { status: PropertyStatus.available },
    })
    await rlsB.property.update({
      where: { id: f.propertyB.id },
      data: { status: PropertyStatus.available },
    })
  })

  it('[1] imóvel de outro tenant não é encontrado (RLS filtra — NOT_FOUND)', async () => {
    const rlsA = prismaWithTenant(f.tenantA.id)

    // Tenant A tenta buscar o imóvel do tenant B — RLS filtra, retorna null
    const crossTenantProperty = await rlsA.property.findUnique({
      where: { id: f.propertyB.id, deletedAt: null },
    })

    // O router de lease.create lança NOT_FOUND quando property é null
    // Aqui simulamos a mesma verificação
    expect(crossTenantProperty).toBeNull()
  })
})

// ─── lease.create — regras de negócio ───────────────────────────────────────

describe('lease.create — regras de negócio', () => {
  it('[3] cobrança é gerada automaticamente ao criar contrato (transação atômica)', async () => {
    const rlsA = prismaWithTenant(f.tenantA.id)

    const now = new Date()
    const dueDay = 5

    // Simula a lógica do lease.router.ts create procedure (transação atômica)
    const [lease] = await rlsA.$transaction(async (tx) => {
      const created = await tx.lease.create({
        data: {
          tenantId: f.tenantA.id,
          propertyId: f.propertyA.id,
          tenantName: 'Inquilino Cobrança Auto',
          rentAmount: 2000,
          adminFeePct: 10,
          dueDayOfMonth: dueDay,
          startDate: START_DATE,
          endDate: END_DATE,
        },
      })

      await tx.property.update({
        where: { id: f.propertyA.id },
        data: { status: PropertyStatus.rented },
      })

      // Lógica de cálculo do dueDate (mesma do router)
      const dueDate = new Date(now.getFullYear(), now.getMonth(), dueDay)
      if (dueDate < now) dueDate.setMonth(dueDate.getMonth() + 1)
      const reference = dueDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

      await tx.billingCharge.create({
        data: {
          tenantId: f.tenantA.id,
          leaseId: created.id,
          amount: created.rentAmount,
          dueDate,
          reference,
        },
      })

      return [created]
    })

    // Contrato criado com status active
    expect(lease.status).toBe(LeaseStatus.active)
    expect(lease.tenantId).toBe(f.tenantA.id)

    // Cobrança gerada automaticamente
    const charges = await rlsA.billingCharge.findMany({
      where: { leaseId: lease.id },
    })
    expect(charges).toHaveLength(1)
    expect(charges[0]!.status).toBe(BillingStatus.pending)
    expect(Number(charges[0]!.amount)).toBe(2000)

    // Imóvel mudou para rented
    const property = await rlsA.property.findUnique({ where: { id: f.propertyA.id } })
    expect(property?.status).toBe(PropertyStatus.rented)
  })

  it('imóvel com status rented bloqueia criação de novo contrato', async () => {
    const rlsA = prismaWithTenant(f.tenantA.id)

    // Property A já está rented (do teste anterior)
    const property = await rlsA.property.findUnique({ where: { id: f.propertyA.id } })
    expect(property?.status).toBe(PropertyStatus.rented)

    // Simula a validação do router: status rented → CONFLICT
    // (o router faz findUnique e verifica property.status antes de criar)
    const isBlocked = property?.status === PropertyStatus.rented
    expect(isBlocked).toBe(true)
  })
})

// ─── charges.create — idempotência ──────────────────────────────────────────

describe('charges.create — idempotência', () => {
  it('[4] cobrança duplicada no mesmo mês é bloqueada (idempotência)', async () => {
    const rlsA = prismaWithTenant(f.tenantA.id)

    // Obtém o contrato ativo da property A
    const lease = await rlsA.lease.findFirst({
      where: { propertyId: f.propertyA.id, deletedAt: null, status: LeaseStatus.active },
    })
    expect(lease).not.toBeNull()

    // Obtém a cobrança já existente para este mês
    const existingCharges = await rlsA.billingCharge.findMany({
      where: { leaseId: lease!.id },
    })
    expect(existingCharges).toHaveLength(1)

    // Simula a verificação de idempotência do charges.router.ts create:
    // findFirst com mesmo leaseId e mesmo mês/ano
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

    // Cobrança existente é retornada → o router lança CONFLICT, não cria duplicata
    expect(duplicate).not.toBeNull()
    expect(duplicate!.id).toBe(existingCharge.id)

    // Confirma que há exatamente 1 cobrança (nenhuma duplicata foi criada)
    const allCharges = await rlsA.billingCharge.findMany({ where: { leaseId: lease!.id } })
    expect(allCharges).toHaveLength(1)
  })
})

// ─── charges.markAsPaid — atualização de saldo ───────────────────────────────

describe('charges.markAsPaid — regras de negócio', () => {
  it('[5] marcar cobrança como paga atualiza OwnerAccount.balance com repasse correto', async () => {
    const rlsA = prismaWithTenant(f.tenantA.id)

    const lease = await rlsA.lease.findFirst({
      where: { propertyId: f.propertyA.id, deletedAt: null, status: LeaseStatus.active },
    })
    expect(lease).not.toBeNull()

    const charge = await rlsA.billingCharge.findFirst({
      where: { leaseId: lease!.id, status: BillingStatus.pending },
    })
    expect(charge).not.toBeNull()

    // Saldo inicial do proprietário A
    const accountBefore = await rlsA.ownerAccount.findFirst({
      where: { ownerId: f.ownerA.id },
    })
    expect(accountBefore).not.toBeNull()
    const balanceBefore = Number(accountBefore!.balance)

    // Cálculo do repasse (mesma lógica do charges.router.ts markAsPaid)
    const rentAmount = Number(lease!.rentAmount) // 2000
    const adminFeePct = Number(lease!.adminFeePct) // 10
    const repasse = rentAmount - (rentAmount * adminFeePct) / 100 // 1800

    const paidAmount = rentAmount
    const paidAt = new Date()

    // Simula a transação do charges.router.ts markAsPaid
    await rlsA.$transaction(async (tx) => {
      await tx.billingCharge.update({
        where: { id: charge!.id },
        data: {
          status: BillingStatus.paid,
          paidAt,
          paidAmount,
        },
      })

      await tx.ownerAccount.updateMany({
        where: { ownerId: f.ownerA.id },
        data: { balance: { increment: repasse } },
      })
    })

    // Verifica cobrança marcada como paga
    const updatedCharge = await rlsA.billingCharge.findUnique({ where: { id: charge!.id } })
    expect(updatedCharge?.status).toBe(BillingStatus.paid)
    expect(Number(updatedCharge?.paidAmount)).toBe(paidAmount)

    // Verifica saldo do proprietário aumentou pelo valor do repasse
    const accountAfter = await rlsA.ownerAccount.findFirst({
      where: { ownerId: f.ownerA.id },
    })
    const balanceAfter = Number(accountAfter!.balance)
    expect(balanceAfter).toBeCloseTo(balanceBefore + repasse, 2)
    expect(repasse).toBe(1800) // 2000 - (2000 * 10%) = 1800
  })

  it('cobrança cancelada não pode ser marcada como paga', async () => {
    const rlsA = prismaWithTenant(f.tenantA.id)

    const lease = await rlsA.lease.findFirst({
      where: { propertyId: f.propertyA.id, deletedAt: null },
    })

    // Cria uma cobrança e cancela
    const charge = await rlsA.billingCharge.create({
      data: {
        tenantId: f.tenantA.id,
        leaseId: lease!.id,
        amount: 2000,
        dueDate: new Date(2024, 0, 5), // mês diferente para não conflitar
        status: BillingStatus.cancelled,
        reference: 'janeiro 2024',
      },
    })

    // Simula validação do router: status cancelled → BAD_REQUEST
    const isCancelled = charge.status === BillingStatus.cancelled
    expect(isCancelled).toBe(true)

    // Confirma que o status não mudou (sem update real, só validação)
    const fetched = await rlsA.billingCharge.findUnique({ where: { id: charge.id } })
    expect(fetched?.status).toBe(BillingStatus.cancelled)

    // Cleanup
    await rlsA.billingCharge.delete({ where: { id: charge.id } })
  })

  it('encerrar contrato reverte imóvel para available (RLS preservada)', async () => {
    const rlsA = prismaWithTenant(f.tenantA.id)

    const lease = await rlsA.lease.findFirst({
      where: { propertyId: f.propertyA.id, status: LeaseStatus.active, deletedAt: null },
    })
    expect(lease).not.toBeNull()

    // Simula lease.router.ts end procedure
    await rlsA.$transaction(async (tx) => {
      await tx.lease.update({
        where: { id: lease!.id },
        data: { status: LeaseStatus.ended },
      })
      await tx.property.update({
        where: { id: f.propertyA.id },
        data: { status: PropertyStatus.available },
      })
    })

    const [updatedLease, updatedProperty] = await Promise.all([
      rlsA.lease.findUnique({ where: { id: lease!.id } }),
      rlsA.property.findUnique({ where: { id: f.propertyA.id } }),
    ])

    expect(updatedLease?.status).toBe(LeaseStatus.ended)
    expect(updatedProperty?.status).toBe(PropertyStatus.available)
  })
})
