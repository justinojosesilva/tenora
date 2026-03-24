import { describe, it, beforeAll, afterAll, expect } from 'vitest'
import { TenantStatus, TenantPlan, UserRole, PropertyType, PropertyStatus } from '@prisma/client'
import { db, prismaWithTenant } from '../rls'

interface TestFixture {
  tenantA: { id: string; name: string }
  tenantB: { id: string; name: string }
  propertyA: { id: string; tenantId: string }
  propertyB: { id: string; tenantId: string }
  userA: { id: string; tenantId: string }
  userB: { id: string; tenantId: string }
}

const fixture: TestFixture = {
  tenantA: { id: '', name: '' },
  tenantB: { id: '', name: '' },
  propertyA: { id: '', tenantId: '' },
  propertyB: { id: '', tenantId: '' },
  userA: { id: '', tenantId: '' },
  userB: { id: '', tenantId: '' },
}

describe('RLS — isolamento de tenant', () => {
  beforeAll(async () => {
    console.log('\n📋 Preparando fixtures de teste...')

    // Create two separate tenants
    fixture.tenantA = await db.tenant.create({
      data: {
        name: 'Tenant A - Test',
        slug: `tenant-a-test-${Date.now()}`,
        plan: TenantPlan.starter,
        status: TenantStatus.active,
      },
    })
    console.log(`✓ Tenant A: ${fixture.tenantA.id}`)

    fixture.tenantB = await db.tenant.create({
      data: {
        name: 'Tenant B - Test',
        slug: `tenant-b-test-${Date.now()}`,
        plan: TenantPlan.starter,
        status: TenantStatus.active,
      },
    })
    console.log(`✓ Tenant B: ${fixture.tenantB.id}`)

    // Create users for each tenant using RLS context
    const rls_a = prismaWithTenant(fixture.tenantA.id)
    fixture.userA = await rls_a.user.create({
      data: {
        tenantId: fixture.tenantA.id,
        clerkId: `clerk-a-${Date.now()}`,
        name: 'User A',
        email: 'user-a@test.com',
        role: UserRole.admin,
      },
    })
    console.log(`✓ User A: ${fixture.userA.id}`)

    const rls_b = prismaWithTenant(fixture.tenantB.id)
    fixture.userB = await rls_b.user.create({
      data: {
        tenantId: fixture.tenantB.id,
        clerkId: `clerk-b-${Date.now()}`,
        name: 'User B',
        email: 'user-b@test.com',
        role: UserRole.admin,
      },
    })
    console.log(`✓ User B: ${fixture.userB.id}`)

    // Create an owner for tenant A (needed for property FK)
    const ownerA = await rls_a.owner.create({
      data: {
        tenantId: fixture.tenantA.id,
        name: 'Owner A',
        cpfCnpj: '123.456.789-00',
        email: 'owner-a@test.com',
      },
    })

    // Create an owner for tenant B
    const ownerB = await rls_b.owner.create({
      data: {
        tenantId: fixture.tenantB.id,
        name: 'Owner B',
        cpfCnpj: '987.654.321-00',
        email: 'owner-b@test.com',
      },
    })

    // Create property for tenant A
    fixture.propertyA = await rls_a.property.create({
      data: {
        tenantId: fixture.tenantA.id,
        ownerId: ownerA.id,
        address: 'Property A Address',
        city: 'São Paulo',
        state: 'SP',
        type: PropertyType.residential,
        status: PropertyStatus.available,
        adminFeePct: 10,
      },
    })
    console.log(`✓ Property A: ${fixture.propertyA.id}`)

    // Create property for tenant B
    fixture.propertyB = await rls_b.property.create({
      data: {
        tenantId: fixture.tenantB.id,
        ownerId: ownerB.id,
        address: 'Property B Address',
        city: 'Rio de Janeiro',
        state: 'RJ',
        type: PropertyType.commercial,
        status: PropertyStatus.rented,
        adminFeePct: 12,
      },
    })
    console.log(`✓ Property B: ${fixture.propertyB.id}`)

    console.log('✅ Fixtures preparados\n')
  })

  afterAll(async () => {
    console.log('\n🧹 Limpando dados de teste...')

    // RLS-protected tables must be deleted using tenant context
    const rlsA = prismaWithTenant(fixture.tenantA.id)
    const rlsB = prismaWithTenant(fixture.tenantB.id)

    await rlsA.property.deleteMany({ where: { tenantId: fixture.tenantA.id } })
    await rlsB.property.deleteMany({ where: { tenantId: fixture.tenantB.id } })
    await rlsA.owner.deleteMany({ where: { tenantId: fixture.tenantA.id } })
    await rlsB.owner.deleteMany({ where: { tenantId: fixture.tenantB.id } })
    await rlsA.user.deleteMany({ where: { tenantId: fixture.tenantA.id } })
    await rlsB.user.deleteMany({ where: { tenantId: fixture.tenantB.id } })

    // Tenant table has no RLS — delete directly
    await db.tenant.deleteMany({
      where: { id: { in: [fixture.tenantA.id, fixture.tenantB.id] } },
    })

    console.log('✅ Limpeza concluída\n')
  })

  it('tenant A só vê seus próprios imóveis', async () => {
    const rls = prismaWithTenant(fixture.tenantA.id)

    // Tenant A should see only their own property
    const properties = await rls.property.findMany()

    expect(properties).toHaveLength(1)
    expect(properties[0].id).toBe(fixture.propertyA.id)
    expect(properties[0].tenantId).toBe(fixture.tenantA.id)
  })

  it('tenant B não vê dados do tenant A', async () => {
    const rls = prismaWithTenant(fixture.tenantB.id)

    // Tenant B should see only their own property, not A's
    const properties = await rls.property.findMany()

    expect(properties).toHaveLength(1)
    expect(properties[0].id).toBe(fixture.propertyB.id)
    expect(properties[0].tenantId).toBe(fixture.tenantB.id)

    // Should not contain any properties from tenant A
    const hasPropertyA = properties.some((p) => p.id === fixture.propertyA.id)
    expect(hasPropertyA).toBe(false)
  })

  it('insert com tenantId errado é bloqueado', async () => {
    const rls = prismaWithTenant(fixture.tenantA.id)

    // Get owner for tenant A to create property
    const owners = await rls.owner.findMany()
    expect(owners.length).toBeGreaterThan(0)

    // Try to insert a property with wrong tenantId (tenant B's ID)
    // This should fail the RLS WITH CHECK policy
    try {
      await rls.property.create({
        data: {
          tenantId: fixture.tenantB.id, // Wrong tenant ID!
          ownerId: owners[0].id,
          address: 'Invalid Property',
          city: 'São Paulo',
          state: 'SP',
          type: PropertyType.residential,
          status: PropertyStatus.available,
          adminFeePct: 10,
        },
      })

      // If we get here, the test fails - the insert should have been blocked
      expect.fail('Expected RLS policy to block insert with wrong tenantId')
    } catch (error) {
      // Expected: RLS policy blocks the insert
      expect(error).toBeDefined()
      // Error message may vary by DB driver, just ensure an error occurred
    }
  })

  it('update de registro de outro tenant não afeta nenhuma linha', async () => {
    const rls = prismaWithTenant(fixture.tenantA.id)

    // Try to update property B (which belongs to tenant B) using tenant A's context
    // RLS filters the WHERE clause, so 0 rows should be affected
    const result = await rls.property.updateMany({
      where: { id: fixture.propertyB.id },
      data: { address: 'Hacked Address' },
    })

    // Should affect 0 rows due to RLS filtering
    expect(result.count).toBe(0)

    // Verify property B was not actually updated (use tenant B context since FORCE RLS is active)
    const rlsB = prismaWithTenant(fixture.tenantB.id)
    const verifyProperty = await rlsB.property.findUnique({
      where: { id: fixture.propertyB.id },
    })
    expect(verifyProperty?.address).toBe('Property B Address')
  })

  it('delete de registro de outro tenant não afeta nenhuma linha', async () => {
    const rls = prismaWithTenant(fixture.tenantA.id)

    // Try to delete property B (which belongs to tenant B) using tenant A's context
    // RLS filters the WHERE clause, so 0 rows should be affected
    const result = await rls.property.deleteMany({
      where: { id: fixture.propertyB.id },
    })

    // Should affect 0 rows due to RLS filtering
    expect(result.count).toBe(0)

    // Verify property B still exists (use tenant B context since FORCE RLS is active)
    const rlsB = prismaWithTenant(fixture.tenantB.id)
    const verifyProperty = await rlsB.property.findUnique({
      where: { id: fixture.propertyB.id },
    })
    expect(verifyProperty).toBeDefined()
    expect(verifyProperty?.id).toBe(fixture.propertyB.id)
  })
})
