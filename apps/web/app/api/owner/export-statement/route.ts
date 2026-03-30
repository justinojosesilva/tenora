import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prismaWithTenant } from '@tenora/db'

type OwnerData = {
  name: string
  cpfCnpj: string
  email: string | null
  phone: string | null
}

type LeaseData = {
  rentAmount: unknown
  adminFeePct: unknown
  tenantName: string
  property: {
    address: string
    city: string | null
  }
}

type ChargeWithLease = {
  paidAt: Date | null
  reference: string | null
  lease: LeaseData
}

function generateCsv(owner: OwnerData, charges: ChargeWithLease[]): string {
  const rows: string[][] = [
    [
      'Mês',
      'Imóvel',
      'Inquilino',
      'Valor Bruto (R$)',
      'Taxa Admin (%)',
      'Valor Líquido (R$)',
      'Data Pagamento',
    ],
    ...charges.map((c) => {
      const rentAmount = Number(c.lease.rentAmount)
      const adminFeePct = Number(c.lease.adminFeePct)
      const repasse = rentAmount - (rentAmount * adminFeePct) / 100
      const month = c.paidAt
        ? new Date(c.paidAt).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
        : (c.reference ?? '')
      const property = [c.lease.property.address, c.lease.property.city].filter(Boolean).join(', ')
      return [
        month,
        property,
        c.lease.tenantName,
        rentAmount.toFixed(2),
        adminFeePct.toFixed(2),
        repasse.toFixed(2),
        c.paidAt ? new Date(c.paidAt).toLocaleDateString('pt-BR') : '',
      ]
    }),
  ]
  return rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
}

function generateHtml(owner: OwnerData, charges: ChargeWithLease[], period: string): string {
  let totalRepasse = 0

  const rows = charges
    .map((c) => {
      const rentAmount = Number(c.lease.rentAmount)
      const adminFeePct = Number(c.lease.adminFeePct)
      const repasse = rentAmount - (rentAmount * adminFeePct) / 100
      totalRepasse += repasse

      const month = c.paidAt
        ? new Date(c.paidAt).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
        : (c.reference ?? '')
      const property = [c.lease.property.address, c.lease.property.city].filter(Boolean).join(', ')
      const paidAtStr = c.paidAt ? new Date(c.paidAt).toLocaleDateString('pt-BR') : ''

      return `<tr>
        <td>${escapeHtml(month)}</td>
        <td>${escapeHtml(property)}</td>
        <td>${escapeHtml(c.lease.tenantName)}</td>
        <td>R$ ${rentAmount.toFixed(2)}</td>
        <td>${adminFeePct.toFixed(2)}%</td>
        <td>R$ ${repasse.toFixed(2)}</td>
        <td>${paidAtStr}</td>
      </tr>`
    })
    .join('\n')

  const emailRow = owner.email ? `<p>E-mail: ${escapeHtml(owner.email)}</p>` : ''
  const generatedAt = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Extrato — ${escapeHtml(owner.name)}</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 12px; color: #333; margin: 40px; }
  h1 { font-size: 18px; color: #1a1a1a; margin-bottom: 4px; }
  .subtitle { color: #666; margin-bottom: 24px; }
  .owner-info { background: #f5f5f5; padding: 12px 16px; border-radius: 6px; margin-bottom: 24px; }
  .owner-info p { margin: 2px 0; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #1D9E75; color: white; text-align: left; padding: 8px 12px; font-size: 11px; }
  td { padding: 7px 12px; border-bottom: 1px solid #eee; }
  tr:nth-child(even) td { background: #fafafa; }
  .total-row td { font-weight: bold; background: #f0faf6; border-top: 2px solid #1D9E75; }
  .footer { margin-top: 32px; font-size: 10px; color: #999; text-align: center; }
  @media print { body { margin: 20px; } }
</style>
</head>
<body>
<h1>Tenora — Extrato de Repasses</h1>
<p class="subtitle">Período: ${escapeHtml(period)}</p>
<div class="owner-info">
  <p><strong>${escapeHtml(owner.name)}</strong></p>
  <p>CPF/CNPJ: ${escapeHtml(owner.cpfCnpj)}</p>
  ${emailRow}
</div>
<table>
  <thead>
    <tr>
      <th>Mês</th><th>Imóvel</th><th>Inquilino</th>
      <th>Valor Bruto</th><th>Taxa Admin</th><th>Valor Líquido</th><th>Data Pgto.</th>
    </tr>
  </thead>
  <tbody>
    ${rows}
    <tr class="total-row">
      <td colspan="5">Total</td>
      <td>R$ ${totalRepasse.toFixed(2)}</td><td></td>
    </tr>
  </tbody>
</table>
<p class="footer">Gerado em ${generatedAt} — Tenora Gestão Imobiliária</p>
</body>
</html>`
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export async function GET(request: NextRequest) {
  const { orgId } = await auth()
  if (!orgId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { searchParams } = request.nextUrl
  const ownerId = searchParams.get('ownerId')
  const format = searchParams.get('format') ?? 'csv'
  const fromDate = searchParams.get('fromDate') ?? undefined
  const toDate = searchParams.get('toDate') ?? undefined

  if (!ownerId) return NextResponse.json({ error: 'ownerId obrigatório' }, { status: 400 })

  const db = prismaWithTenant(orgId)

  const [owner, charges] = await Promise.all([
    db.owner.findUnique({
      where: { id: ownerId, deletedAt: null },
      select: { name: true, cpfCnpj: true, email: true, phone: true },
    }),
    db.billingCharge.findMany({
      where: {
        status: 'paid',
        ...(fromDate || toDate
          ? {
              paidAt: {
                ...(fromDate && { gte: new Date(fromDate) }),
                ...(toDate && { lte: new Date(toDate) }),
              },
            }
          : {}),
        lease: { property: { ownerId } },
      },
      include: {
        lease: {
          select: {
            rentAmount: true,
            adminFeePct: true,
            tenantName: true,
            property: { select: { address: true, city: true } },
          },
        },
      },
      orderBy: { paidAt: 'desc' },
    }),
  ])

  if (!owner) return NextResponse.json({ error: 'Proprietário não encontrado' }, { status: 404 })

  const ownerSlug = owner.name.toLowerCase().replace(/\s+/g, '-')

  const periodParts: string[] = []
  if (fromDate) periodParts.push(`De ${new Date(fromDate).toLocaleDateString('pt-BR')}`)
  if (toDate) periodParts.push(`até ${new Date(toDate).toLocaleDateString('pt-BR')}`)
  const period = periodParts.length > 0 ? periodParts.join(' ') : 'Todos os períodos'

  if (format === 'pdf') {
    const html = generateHtml(owner, charges as ChargeWithLease[], period)
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="extrato-${ownerSlug}.html"`,
      },
    })
  }

  const csv = generateCsv(owner, charges as ChargeWithLease[])
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="extrato-${ownerSlug}.csv"`,
    },
  })
}
