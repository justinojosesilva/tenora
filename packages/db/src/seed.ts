import {
  TenantPlan,
  TenantStatus,
  UserRole,
  PropertyType,
  PropertyStatus,
  LeaseStatus,
  BillingStatus,
  BillingType,
  TransactionType,
  TransactionOrigin,
  TransactionStatus,
  MaintenanceStatus,
} from '@prisma/client'
import { db, prismaWithTenant } from './rls'

// ---------------------------------------------------------------------------
// Seed idempotente: rodar duas vezes não cria duplicatas.
// Estratégia: busca tenant pelo slug; se existir, limpa seus dados (via RLS)
// e recria tudo do zero.
// ---------------------------------------------------------------------------

async function seed() {
  console.log('🌱 Iniciando seed do banco de dados...\n')

  try {
    await seedTenant({
      slug: 'imob-central',
      name: 'Imobiliária Central',
      cnpj: '12.345.678/0001-90',
      plan: TenantPlan.pro,
      propertyCount: 10,
      leaseCount: 8,
      userCount: 3,
    })

    await seedTenant({
      slug: 'gestora-silva',
      name: 'Gestora Silva',
      cnpj: '98.765.432/0001-10',
      plan: TenantPlan.starter,
      propertyCount: 5,
      leaseCount: 4,
      userCount: 2,
    })

    console.log('\n✅ Seed concluído com sucesso!\n')
  } catch (error) {
    console.error('❌ Erro durante seed:', error)
    throw error
  } finally {
    await db.$disconnect()
  }
}

interface TenantSpec {
  slug: string
  name: string
  cnpj: string
  plan: TenantPlan
  propertyCount: number
  leaseCount: number
  userCount: number
}

async function seedTenant(spec: TenantSpec) {
  console.log(`\n📦 Processando tenant: ${spec.name}...`)

  // Idempotência: busca tenant existente pelo slug
  let tenant = await db.tenant.findUnique({ where: { slug: spec.slug } })

  if (tenant) {
    console.log(`  ↩ Tenant já existe (${tenant.id}) — limpando dados anteriores...`)
    await cleanTenantData(tenant.id)
  } else {
    tenant = await db.tenant.create({
      data: {
        name: spec.name,
        slug: spec.slug,
        cnpj: spec.cnpj,
        plan: spec.plan,
        status: TenantStatus.active,
      },
    })
    console.log(`  ✓ Tenant criado: ${tenant.id}`)
  }

  await seedTenantData(tenant.id, spec)
}

async function cleanTenantData(tenantId: string) {
  const rls = prismaWithTenant(tenantId)
  // Ordem: dependências mais profundas primeiro
  await rls.transactionSplit.deleteMany({ where: { tenantId } })
  await rls.transaction.deleteMany({ where: { tenantId } })
  await rls.billingCharge.deleteMany({ where: { tenantId } })
  await rls.maintenanceOrder.deleteMany({ where: { tenantId } })
  await rls.bankConnection.deleteMany({}) // sem tenantId direto — RLS filtra
  await rls.bankAccount.deleteMany({ where: { tenantId } })
  await rls.lease.deleteMany({ where: { tenantId } })
  await rls.property.deleteMany({ where: { tenantId } })
  await rls.ownerAccount.deleteMany({ where: { tenantId } })
  await rls.owner.deleteMany({ where: { tenantId } })
  await rls.category.deleteMany({ where: { tenantId } })
  await rls.user.deleteMany({ where: { tenantId } })
}

async function seedTenantData(tenantId: string, spec: TenantSpec) {
  const rls = prismaWithTenant(tenantId)
  const tag = spec.slug

  // ── Usuários ──────────────────────────────────────────────────────────────
  const roles = [UserRole.admin, UserRole.operacional, UserRole.financeiro]
  const roleLabels = ['Admin', 'Operador', 'Financeiro']

  for (let i = 0; i < spec.userCount; i++) {
    await rls.user.create({
      data: {
        tenantId,
        clerkId: `clerk-${tag}-user-${i + 1}`,
        name: `${roleLabels[i]} - ${spec.name}`,
        email: `${roleLabels[i].toLowerCase()}@${tag}.com`,
        role: roles[i],
      },
    })
  }
  console.log(`  ✓ ${spec.userCount} usuário(s) criado(s)`)

  // ── Proprietários ─────────────────────────────────────────────────────────
  const ownerCount = Math.ceil(spec.propertyCount / 3)
  const owners: string[] = []

  for (let i = 0; i < ownerCount; i++) {
    const owner = await rls.owner.create({
      data: {
        tenantId,
        name: `Proprietário ${i + 1} - ${spec.name}`,
        cpfCnpj: `${String(i + 1).padStart(3, '0')}.456.789-${String(i * 10).padStart(2, '0')}`,
        email: `proprietario${i + 1}@${tag}.com`,
        phone: `(11) 9${String(9000 + i)}`,
      },
    })
    await rls.ownerAccount.create({
      data: { tenantId, ownerId: owner.id, balance: 5000 + i * 1000 },
    })
    owners.push(owner.id)
  }
  console.log(`  ✓ ${ownerCount} proprietário(s) criado(s)`)

  // ── Imóveis ───────────────────────────────────────────────────────────────
  const streets = [
    'Rua das Flores',
    'Av. Paulista',
    'Rua Oscar Freire',
    'Rua Augusta',
    'Av. Faria Lima',
    'Rua da Consolação',
    'Rua Haddock Lobo',
    'Av. Brasil',
    'Rua dos Pinheiros',
    'Av. Rebouças',
  ]
  const types = [PropertyType.residential, PropertyType.residential, PropertyType.commercial]
  const properties: string[] = []

  for (let i = 0; i < spec.propertyCount; i++) {
    const isRented = i < spec.leaseCount
    const prop = await rls.property.create({
      data: {
        tenantId,
        ownerId: owners[i % owners.length],
        code: `${tag.toUpperCase()}-${String(i + 1).padStart(3, '0')}`,
        address: `${streets[i % streets.length]}, ${100 + i * 50}`,
        city: i % 3 === 0 ? 'Rio de Janeiro' : 'São Paulo',
        state: i % 3 === 0 ? 'RJ' : 'SP',
        zipCode: `0${String(1000 + i).padStart(4, '0')}-000`,
        type: types[i % types.length],
        area: 60 + i * 15,
        status: isRented ? PropertyStatus.rented : PropertyStatus.available,
        adminFeePct: 8 + (i % 3) * 2,
        rentAmount: 2500 + i * 500,
      },
    })
    properties.push(prop.id)
  }
  console.log(`  ✓ ${spec.propertyCount} imóvel(is) criado(s)`)

  // ── Contratos (Leases) ────────────────────────────────────────────────────
  const leases: string[] = []

  for (let i = 0; i < spec.leaseCount; i++) {
    const rentAmount = 2500 + i * 500
    const adminFeePct = 8 + (i % 3) * 2
    const lease = await rls.lease.create({
      data: {
        tenantId,
        propertyId: properties[i],
        tenantName: `Inquilino ${i + 1} - ${spec.name}`,
        tenantCpf: `9${String(i + 1).padStart(2, '0')}.876.543-${String(i * 10).padStart(2, '0')}`,
        tenantEmail: `inquilino${i + 1}@email.com`,
        tenantPhone: `(11) 9${String(8000 + i)}`,
        rentAmount,
        adminFeePct,
        readjustIndex: i % 2 === 0 ? 'IGPM' : 'IPCA',
        dueDayOfMonth: 5 + (i % 3) * 5,
        startDate: new Date(`2024-0${(i % 9) + 1}-01`),
        endDate: new Date(`2026-0${(i % 9) + 1}-01`),
        status: i < Math.floor(spec.leaseCount * 0.75) ? LeaseStatus.active : LeaseStatus.renewing,
        signedAt: new Date(`2023-1${(i % 2) + 1}-01`),
      },
    })
    leases.push(lease.id)
  }
  console.log(`  ✓ ${spec.leaseCount} contrato(s) criado(s)`)

  // ── Conta bancária ────────────────────────────────────────────────────────
  const bankAccount = await rls.bankAccount.create({
    data: {
      tenantId,
      name: `Conta Principal - ${spec.name}`,
      bankCode: '001',
      agency: '0001',
      accountNumber: `${tag.replace('-', '')}001`,
      accountType: 'checking',
      isPrimary: true,
    },
  })
  console.log(`  ✓ Conta bancária criada`)

  // ── Categorias ────────────────────────────────────────────────────────────
  const catReceita = await rls.category.create({
    data: {
      tenantId,
      name: 'Aluguéis Recebidos',
      type: 'income',
      group: 'aluguel',
      isSystem: true,
    },
  })
  const catDespesa = await rls.category.create({
    data: {
      tenantId,
      name: 'Despesas Operacionais',
      type: 'expense',
      group: 'operacional',
      isSystem: false,
    },
  })

  // ── Cobranças e Transações (para os primeiros contratos) ──────────────────
  for (let i = 0; i < Math.min(spec.leaseCount, 4); i++) {
    const rentAmount = 2500 + i * 500
    const isPaid = i % 2 === 0

    const billing = await rls.billingCharge.create({
      data: {
        tenantId,
        leaseId: leases[i],
        amount: rentAmount,
        dueDate: new Date('2025-03-05'),
        paidAt: isPaid ? new Date('2025-03-03') : null,
        paidAmount: isPaid ? rentAmount : null,
        status: isPaid ? BillingStatus.paid : BillingStatus.pending,
        type: i % 2 === 0 ? BillingType.pix : BillingType.transfer,
        reference: `Março 2025 - Inquilino ${i + 1}`,
      },
    })

    if (isPaid) {
      const tx = await rls.transaction.create({
        data: {
          tenantId,
          bankAccountId: bankAccount.id,
          leaseId: leases[i],
          categoryId: catReceita.id,
          description: `Aluguel recebido - Inquilino ${i + 1}`,
          amount: rentAmount,
          type: TransactionType.credit,
          origin: TransactionOrigin.manual,
          status: TransactionStatus.categorized,
          date: new Date('2025-03-03'),
        },
      })

      const adminFee = Math.round(rentAmount * ((8 + (i % 3) * 2) / 100))
      await rls.transactionSplit.create({
        data: {
          tenantId,
          transactionId: tx.id,
          party: 'owner',
          amount: rentAmount - adminFee,
          description: 'Repasse ao proprietário',
        },
      })
      await rls.transactionSplit.create({
        data: {
          tenantId,
          transactionId: tx.id,
          party: 'agency',
          amount: adminFee,
          description: 'Taxa da imobiliária',
        },
      })
    }
  }
  console.log(`  ✓ Cobranças e transações criadas`)

  // ── Ordens de manutenção ──────────────────────────────────────────────────
  await rls.maintenanceOrder.create({
    data: {
      tenantId,
      propertyId: properties[0],
      title: 'Reparo hidráulico',
      description: 'Vazamento na cozinha',
      status: MaintenanceStatus.approved,
      cost: 350,
      supplier: 'Hidráulica Express',
      scheduledAt: new Date('2025-03-15'),
    },
  })
  await rls.maintenanceOrder.create({
    data: {
      tenantId,
      propertyId: properties[1 % spec.propertyCount],
      title: 'Pintura geral',
      description: 'Pintura completa do apartamento',
      status: MaintenanceStatus.requested,
      cost: 1200,
      supplier: null,
      scheduledAt: null,
    },
  })
  console.log(`  ✓ Ordens de manutenção criadas`)
}

seed()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
