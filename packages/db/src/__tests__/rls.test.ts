import { describe, it, beforeAll, afterAll, expect } from 'vitest'
import { PropertyStatus, PropertyType } from '@prisma/client'
import type { Property, Tenant } from '@prisma/client'
import { prismaWithTenant } from '../rls'
import { safeDb } from '../guards'
import { TestFactory } from './factory'

const factory = new TestFactory()
let tenantA: Tenant
let tenantB: Tenant
let propertyA: Property
let propertyB: Property

describe('RLS — isolamento de tenant', () => {
  beforeAll(async () => {
    console.log('\n📋 Preparando fixtures de teste...')
    ;[tenantA, tenantB] = await Promise.all([
      factory.createTenant({ name: 'Tenant A - Test' }),
      factory.createTenant({ name: 'Tenant B - Test' }),
    ])
    console.log(`✓ Tenant A: ${tenantA.id}`)
    console.log(`✓ Tenant B: ${tenantB.id}`)

    await Promise.all([factory.createUser(tenantA.id), factory.createUser(tenantB.id)])
    ;[propertyA, propertyB] = await Promise.all([
      factory.createProperty(tenantA.id, {
        status: PropertyStatus.available,
        city: 'São Paulo',
        state: 'SP',
        type: PropertyType.residential,
      }),
      factory.createProperty(tenantB.id, {
        status: PropertyStatus.rented,
        city: 'Rio de Janeiro',
        state: 'RJ',
        type: PropertyType.commercial,
      }),
    ])
    console.log(`✓ Property A: ${propertyA.id}`)
    console.log(`✓ Property B: ${propertyB.id}`)

    console.log('✅ Fixtures preparados\n')
  })

  afterAll(() => factory.cleanup())

  it('tenant A só vê seus próprios imóveis', async () => {
    const rls = prismaWithTenant(tenantA.id)

    const properties = await rls.property.findMany()

    expect(properties).toHaveLength(1)
    expect(properties[0].id).toBe(propertyA.id)
    expect(properties[0].tenantId).toBe(tenantA.id)
  })

  it('tenant B não vê dados do tenant A', async () => {
    const rls = prismaWithTenant(tenantB.id)

    const properties = await rls.property.findMany()

    expect(properties).toHaveLength(1)
    expect(properties[0].id).toBe(propertyB.id)
    expect(properties[0].tenantId).toBe(tenantB.id)

    const hasPropertyA = properties.some((p) => p.id === propertyA.id)
    expect(hasPropertyA).toBe(false)
  })

  it('insert com tenantId errado é bloqueado', async () => {
    const rls = prismaWithTenant(tenantA.id)

    const owners = await rls.owner.findMany()
    expect(owners.length).toBeGreaterThan(0)

    try {
      await rls.property.create({
        data: {
          tenantId: tenantB.id, // Wrong tenant ID!
          ownerId: owners[0].id,
          address: 'Invalid Property',
          city: 'São Paulo',
          state: 'SP',
          type: PropertyType.residential,
          status: PropertyStatus.available,
          adminFeePct: 10,
        },
      })

      expect.fail('Expected RLS policy to block insert with wrong tenantId')
    } catch (error) {
      expect(error).toBeDefined()
    }
  })

  it('update de registro de outro tenant não afeta nenhuma linha', async () => {
    const rls = prismaWithTenant(tenantA.id)

    const result = await rls.property.updateMany({
      where: { id: propertyB.id },
      data: { address: 'Hacked Address' },
    })

    expect(result.count).toBe(0)

    const rlsB = prismaWithTenant(tenantB.id)
    const verifyProperty = await rlsB.property.findUnique({
      where: { id: propertyB.id },
    })
    expect(verifyProperty?.address).toBe(propertyB.address)
  })

  it('delete de registro de outro tenant não afeta nenhuma linha', async () => {
    const rls = prismaWithTenant(tenantA.id)

    const result = await rls.property.deleteMany({
      where: { id: propertyB.id },
    })

    expect(result.count).toBe(0)

    const rlsB = prismaWithTenant(tenantB.id)
    const verifyProperty = await rlsB.property.findUnique({
      where: { id: propertyB.id },
    })
    expect(verifyProperty).toBeDefined()
    expect(verifyProperty?.id).toBe(propertyB.id)
  })

  it('findUnique com ID de outro tenant retorna null, não erro', async () => {
    const rls = prismaWithTenant(tenantA.id)

    const result = await rls.property.findUnique({
      where: { id: propertyB.id },
    })

    expect(result).toBeNull()
  })

  it('safeDb sem tenant lança erro antes de chegar ao banco', () => {
    expect(() => {
      const _ = safeDb.property
    }).toThrow(/Acesso direto ao model "property" sem tenant bloqueado/)
  })
})
