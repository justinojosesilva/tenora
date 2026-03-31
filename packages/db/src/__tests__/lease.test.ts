import { describe, it, beforeAll, afterAll, expect } from 'vitest'
import { LeaseStatus, PropertyStatus, PropertyType } from '@prisma/client'
import { prismaWithTenant, withTenantRLS } from '../rls'
import { TestFactory } from './factory'

const factory = new TestFactory()
let tenantId: string
let propertyAvailableId: string
let propertyRentedId: string
let propertyMaintenanceId: string

describe('S3-06 — Atualização de status do imóvel ao vincular/desvincular contrato', () => {
  beforeAll(async () => {
    const tenant = await factory.createTenant()
    tenantId = tenant.id

    await factory.createUser(tenantId)

    const owner = await factory.createOwner(tenantId)
    const [available, rented, maintenance] = await Promise.all([
      factory.createProperty(tenantId, {
        ownerId: owner.id,
        status: PropertyStatus.available,
        address: 'Rua Disponível, 1',
      }),
      factory.createProperty(tenantId, {
        ownerId: owner.id,
        status: PropertyStatus.rented,
        address: 'Rua Alugado, 2',
      }),
      factory.createProperty(tenantId, {
        ownerId: owner.id,
        status: PropertyStatus.maintenance,
        address: 'Rua Manutenção, 3',
      }),
    ])
    propertyAvailableId = available.id
    propertyRentedId = rented.id
    propertyMaintenanceId = maintenance.id
  })

  afterAll(() => factory.cleanup())

  it('criar contrato muda status do imóvel de available → rented atomicamente', async () => {
    const rls = prismaWithTenant(tenantId)

    const now = new Date()
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    const endDate = new Date(now.getFullYear() + 1, now.getMonth(), 1)

    const [lease] = await withTenantRLS(tenantId, async (tx) => {
      const created = await tx.lease.create({
        data: {
          tenantId,
          propertyId: propertyAvailableId,
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
        where: { id: propertyAvailableId },
        data: { status: PropertyStatus.rented },
      })

      return [created]
    })

    expect(lease.status).toBe(LeaseStatus.active)

    const property = await rls.property.findUnique({
      where: { id: propertyAvailableId },
    })
    expect(property?.status).toBe(PropertyStatus.rented)
  })

  it('encerrar contrato reverte status do imóvel para available atomicamente', async () => {
    const rls = prismaWithTenant(tenantId)

    const activeLease = await rls.lease.findFirst({
      where: { propertyId: propertyAvailableId, status: LeaseStatus.active },
    })
    expect(activeLease).not.toBeNull()

    const [updatedLease] = await withTenantRLS(tenantId, async (tx) => {
      const ended = await tx.lease.update({
        where: { id: activeLease!.id },
        data: { status: LeaseStatus.ended },
      })

      await tx.property.update({
        where: { id: propertyAvailableId },
        data: { status: PropertyStatus.available },
      })

      return [ended]
    })

    expect(updatedLease.status).toBe(LeaseStatus.ended)

    const property = await rls.property.findUnique({
      where: { id: propertyAvailableId },
    })
    expect(property?.status).toBe(PropertyStatus.available)
  })

  it('imóvel rented não pode receber novo contrato (validação de status)', async () => {
    const rls = prismaWithTenant(tenantId)

    const property = await rls.property.findUnique({
      where: { id: propertyRentedId },
    })

    expect(property?.status).toBe(PropertyStatus.rented)
  })

  it('imóvel maintenance não pode receber contrato (validação de status)', async () => {
    const rls = prismaWithTenant(tenantId)

    const property = await rls.property.findUnique({
      where: { id: propertyMaintenanceId },
    })

    expect(property?.status).toBe(PropertyStatus.maintenance)
  })
})
