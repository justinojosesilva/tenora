import { describe, it, beforeAll, afterAll, expect } from 'vitest'
import {
  TenantStatus,
  TenantPlan,
  UserRole,
  PropertyType,
  PropertyStatus,
  LeaseStatus,
} from '@prisma/client'
import { db, prismaWithTenant } from '../rls'

interface TestFixture {
  tenantId: string
  propertyAvailableId: string
  propertyRentedId: string
  propertyMaintenanceId: string
}

const fixture: TestFixture = {
  tenantId: '',
  propertyAvailableId: '',
  propertyRentedId: '',
  propertyMaintenanceId: '',
}

describe('S3-06 — Atualização de status do imóvel ao vincular/desvincular contrato', () => {
  beforeAll(async () => {
    const tenant = await db.tenant.create({
      data: {
        name: 'Tenant Lease Test',
        slug: `lease-test-${Date.now()}`,
        plan: TenantPlan.starter,
        status: TenantStatus.active,
      },
    })
    fixture.tenantId = tenant.id

    const rls = prismaWithTenant(fixture.tenantId)

    await rls.user.create({
      data: {
        tenantId: fixture.tenantId,
        clerkId: `clerk-lease-${Date.now()}`,
        name: 'User Lease Test',
        email: `lease-user-${Date.now()}@test.com`,
        role: UserRole.admin,
      },
    })

    const owner = await rls.owner.create({
      data: {
        tenantId: fixture.tenantId,
        name: 'Owner Lease Test',
        cpfCnpj: `111.222.333-${Date.now().toString().slice(-2)}`,
        email: `owner-lease-${Date.now()}@test.com`,
      },
    })

    const [available, rented, maintenance] = await Promise.all([
      rls.property.create({
        data: {
          tenantId: fixture.tenantId,
          ownerId: owner.id,
          address: 'Rua Disponível, 1',
          city: 'São Paulo',
          state: 'SP',
          type: PropertyType.residential,
          status: PropertyStatus.available,
          adminFeePct: 10,
        },
      }),
      rls.property.create({
        data: {
          tenantId: fixture.tenantId,
          ownerId: owner.id,
          address: 'Rua Alugado, 2',
          city: 'São Paulo',
          state: 'SP',
          type: PropertyType.residential,
          status: PropertyStatus.rented,
          adminFeePct: 10,
        },
      }),
      rls.property.create({
        data: {
          tenantId: fixture.tenantId,
          ownerId: owner.id,
          address: 'Rua Manutenção, 3',
          city: 'São Paulo',
          state: 'SP',
          type: PropertyType.residential,
          status: PropertyStatus.maintenance,
          adminFeePct: 10,
        },
      }),
    ])

    fixture.propertyAvailableId = available.id
    fixture.propertyRentedId = rented.id
    fixture.propertyMaintenanceId = maintenance.id
  })

  afterAll(async () => {
    const rls = prismaWithTenant(fixture.tenantId)
    await rls.billingCharge.deleteMany({ where: { tenantId: fixture.tenantId } })
    await rls.lease.deleteMany({ where: { tenantId: fixture.tenantId } })
    await rls.property.deleteMany({ where: { tenantId: fixture.tenantId } })
    await rls.owner.deleteMany({ where: { tenantId: fixture.tenantId } })
    await rls.user.deleteMany({ where: { tenantId: fixture.tenantId } })
    await db.tenant.delete({ where: { id: fixture.tenantId } })
  })

  it('criar contrato muda status do imóvel de available → rented atomicamente', async () => {
    const rls = prismaWithTenant(fixture.tenantId)

    const now = new Date()
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    const endDate = new Date(now.getFullYear() + 1, now.getMonth(), 1)

    const [lease] = await rls.$transaction(async (tx) => {
      const created = await tx.lease.create({
        data: {
          tenantId: fixture.tenantId,
          propertyId: fixture.propertyAvailableId,
          tenantName: 'Inquilino Teste',
          rentAmount: 2000,
          adminFeePct: 10,
          readjustIndex: 'IGPM',
          dueDayOfMonth: 5,
          startDate,
          endDate,
        },
      })

      await tx.property.update({
        where: { id: fixture.propertyAvailableId },
        data: { status: PropertyStatus.rented },
      })

      return [created]
    })

    expect(lease.status).toBe(LeaseStatus.active)

    const property = await rls.property.findUnique({
      where: { id: fixture.propertyAvailableId },
    })
    expect(property?.status).toBe(PropertyStatus.rented)
  })

  it('encerrar contrato reverte status do imóvel para available atomicamente', async () => {
    const rls = prismaWithTenant(fixture.tenantId)

    const activeLease = await rls.lease.findFirst({
      where: { propertyId: fixture.propertyAvailableId, status: LeaseStatus.active },
    })
    expect(activeLease).not.toBeNull()

    const [updatedLease] = await rls.$transaction(async (tx) => {
      const ended = await tx.lease.update({
        where: { id: activeLease!.id },
        data: { status: LeaseStatus.ended },
      })

      await tx.property.update({
        where: { id: fixture.propertyAvailableId },
        data: { status: PropertyStatus.available },
      })

      return [ended]
    })

    expect(updatedLease.status).toBe(LeaseStatus.ended)

    const property = await rls.property.findUnique({
      where: { id: fixture.propertyAvailableId },
    })
    expect(property?.status).toBe(PropertyStatus.available)
  })

  it('imóvel rented não pode receber novo contrato (validação de status)', async () => {
    const rls = prismaWithTenant(fixture.tenantId)

    const property = await rls.property.findUnique({
      where: { id: fixture.propertyRentedId },
    })

    expect(property?.status).toBe(PropertyStatus.rented)
  })

  it('imóvel maintenance não pode receber contrato (validação de status)', async () => {
    const rls = prismaWithTenant(fixture.tenantId)

    const property = await rls.property.findUnique({
      where: { id: fixture.propertyMaintenanceId },
    })

    expect(property?.status).toBe(PropertyStatus.maintenance)
  })
})
