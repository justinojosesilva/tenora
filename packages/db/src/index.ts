export { prismaWithTenant, withTenantRLS, db } from './rls'
export { safeDb } from './guards'
export type { TenantDB } from './rls'
export type {
  PropertyStatus,
  PropertyType,
  // ownerId is intentionally omitted from Lease — the owner is accessible via
  // property.owner. Adding it here would be denormalization requiring an extra
  // migration with no query-performance benefit given current access patterns.
  LeaseStatus,
  BillingStatus,
  BillingType,
  Prisma,
  Property,
  Owner,
  Lease,
  BillingCharge,
  Transaction,
  MaintenanceOrder,
  OwnerAccount,
  Tenant,
  User,
  BankConnection,
  BankAccount,
} from '@prisma/client'
