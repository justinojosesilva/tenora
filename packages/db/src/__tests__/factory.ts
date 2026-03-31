/**
 * TestFactory — factory pattern para dados de teste
 *
 * Uso:
 *   const factory = new TestFactory()
 *
 *   beforeAll(async () => {
 *     const tenant = await factory.createTenant()
 *     const property = await factory.createProperty(tenant.id)
 *   })
 *
 *   afterAll(() => factory.cleanup())
 *
 * A instância rastreia todos os tenants criados e os apaga
 * em ordem reversa na chamada de cleanup().
 */
import { PropertyStatus, PropertyType, TenantPlan, TenantStatus, UserRole } from '@prisma/client'
import type { Owner, Property, Tenant, User } from '@prisma/client'
import { db, prismaWithTenant } from '../rls'

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function randomCpfCnpj(): string {
  const d = () => Math.floor(Math.random() * 9 + 1)
  return `${d()}${d()}${d()}.${d()}${d()}${d()}.${d()}${d()}${d()}-${d()}${d()}`
}

export class TestFactory {
  private readonly tenantIds: string[] = []

  async createTenant(overrides?: {
    name?: string
    slug?: string
    plan?: TenantPlan
    status?: TenantStatus
  }): Promise<Tenant> {
    const id = uid()
    const tenant = await db.tenant.create({
      data: {
        name: `Test Tenant ${id}`,
        slug: `test-tenant-${id}`,
        plan: TenantPlan.starter,
        status: TenantStatus.active,
        ...overrides,
      },
    })
    this.tenantIds.push(tenant.id)
    return tenant
  }

  async createOwner(
    tenantId: string,
    overrides?: { name?: string; cpfCnpj?: string; email?: string },
  ): Promise<Owner> {
    const id = uid()
    return prismaWithTenant(tenantId).owner.create({
      data: {
        tenantId,
        name: `Owner ${id}`,
        cpfCnpj: randomCpfCnpj(),
        email: `owner-${id}@test.com`,
        ...overrides,
      },
    })
  }

  async createProperty(
    tenantId: string,
    overrides?: {
      ownerId?: string
      address?: string
      city?: string
      state?: string
      type?: PropertyType
      status?: PropertyStatus
      adminFeePct?: number
      rentAmount?: number
    },
  ): Promise<Property> {
    const { ownerId: explicitOwnerId, ...rest } = overrides ?? {}
    const ownerId = explicitOwnerId ?? (await this.createOwner(tenantId)).id
    return prismaWithTenant(tenantId).property.create({
      data: {
        tenantId,
        ownerId,
        address: `Rua Teste ${uid()}, 100`,
        city: 'São Paulo',
        state: 'SP',
        type: PropertyType.residential,
        status: PropertyStatus.available,
        adminFeePct: 10,
        ...rest,
      },
    })
  }

  async createUser(
    tenantId: string,
    overrides?: {
      clerkId?: string
      name?: string
      email?: string
      role?: UserRole
    },
  ): Promise<User> {
    const id = uid()
    return prismaWithTenant(tenantId).user.create({
      data: {
        tenantId,
        clerkId: `clerk-${id}`,
        name: `User ${id}`,
        email: `user-${id}@test.com`,
        role: UserRole.admin,
        ...overrides,
      },
    })
  }

  /**
   * Apaga todos os dados criados por esta instância na ordem correta
   * (filhos antes de pais) e reseta o estado interno.
   */
  async cleanup(): Promise<void> {
    for (const tenantId of [...this.tenantIds].reverse()) {
      const rls = prismaWithTenant(tenantId)
      await rls.billingCharge.deleteMany({ where: { tenantId } })
      await rls.lease.deleteMany({ where: { tenantId } })
      await rls.ownerAccount.deleteMany({ where: { tenantId } })
      await rls.maintenanceOrder.deleteMany({ where: { tenantId } })
      await rls.property.deleteMany({ where: { tenantId } })
      await rls.owner.deleteMany({ where: { tenantId } })
      await rls.user.deleteMany({ where: { tenantId } })
      await db.tenant.delete({ where: { id: tenantId } })
    }
    this.tenantIds.length = 0
  }
}
