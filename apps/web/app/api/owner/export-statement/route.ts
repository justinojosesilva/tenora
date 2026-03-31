import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createElement as h } from 'react'
import { auth } from '@clerk/nextjs/server'
import { db as rootDb, prismaWithTenant } from '@tenora/db'
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer'
import { renderToStream } from '@react-pdf/renderer'

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

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#333',
  },
  header: {
    display: 'flex',
    flexDirection: 'row',
    marginBottom: 24,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  logoContainer: {
    width: 60,
    height: 60,
  },
  logo: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
  titleSection: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: '#666',
    marginBottom: 16,
  },
  ownerInfo: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 4,
    marginBottom: 24,
  },
  ownerName: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  ownerField: {
    marginBottom: 2,
    fontSize: 9,
  },
  table: {
    marginBottom: 24,
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  tableHeader: {
    display: 'flex',
    flexDirection: 'row',
    backgroundColor: '#1D9E75',
    color: 'white',
    fontWeight: 'bold',
    fontSize: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#1D9E75',
  },
  tableRow: {
    display: 'flex',
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tableRowAlternate: {
    backgroundColor: '#fafafa',
  },
  tableRowTotal: {
    backgroundColor: '#f0faf6',
    borderTopWidth: 2,
    borderTopColor: '#1D9E75',
    fontWeight: 'bold',
  },
  tableCell: {
    flex: 1,
    padding: 8,
    fontSize: 9,
  },
  tableCellSmall: {
    flex: 0.7,
    padding: 8,
    fontSize: 9,
  },
  footer: {
    marginTop: 32,
    fontSize: 8,
    color: '#999',
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 12,
  },
})

function generatePdfDocument(
  owner: OwnerData,
  charges: ChargeWithLease[],
  period: string,
  logoUrl?: string | null,
) {
  let totalRepasse = 0

  const chargeRows = charges.map((c) => {
    const rentAmount = Number(c.lease.rentAmount)
    const adminFeePct = Number(c.lease.adminFeePct)
    const repasse = rentAmount - (rentAmount * adminFeePct) / 100
    totalRepasse += repasse

    const month = c.paidAt
      ? new Date(c.paidAt).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
      : (c.reference ?? '')
    const property = [c.lease.property.address, c.lease.property.city].filter(Boolean).join(', ')
    const paidAtStr = c.paidAt ? new Date(c.paidAt).toLocaleDateString('pt-BR') : ''

    return {
      month,
      property,
      tenantName: c.lease.tenantName,
      rentAmount,
      adminFeePct,
      repasse,
      paidAtStr,
    }
  })

  const generatedAt = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  // Header elements
  const headerElements = [
    ...(logoUrl
      ? [h(View, { style: styles.logoContainer }, h(Image, { src: logoUrl, style: styles.logo }))]
      : []),
    h(
      View,
      { style: styles.titleSection },
      h(Text, { style: styles.title }, 'Tenora — Extrato de Repasses'),
      h(Text, { style: styles.subtitle }, `Período: ${period}`),
    ),
  ]

  // Owner info elements
  const ownerInfoElements = [
    h(Text, { style: styles.ownerName }, owner.name),
    h(Text, { style: styles.ownerField }, `CPF/CNPJ: ${owner.cpfCnpj}`),
    ...(owner.email ? [h(Text, { style: styles.ownerField }, `E-mail: ${owner.email}`)] : []),
  ]

  // Table header row
  const tableHeaderRow = h(
    View,
    { style: styles.tableHeader },
    h(Text, { style: styles.tableCell }, 'Mês'),
    h(Text, { style: [styles.tableCell, { flex: 1.5 }] }, 'Imóvel'),
    h(Text, { style: styles.tableCell }, 'Inquilino'),
    h(Text, { style: styles.tableCellSmall }, 'Valor Bruto'),
    h(Text, { style: styles.tableCellSmall }, 'Taxa Admin'),
    h(Text, { style: styles.tableCellSmall }, 'Valor Líquido'),
    h(Text, { style: styles.tableCellSmall }, 'Data Pgto.'),
  )

  // Table rows
  const tableRows = chargeRows.map((row, idx) =>
    h(
      View,
      {
        style: [styles.tableRow, ...(idx % 2 === 1 ? [styles.tableRowAlternate] : [])],
      },
      h(Text, { style: styles.tableCell }, row.month),
      h(Text, { style: [styles.tableCell, { flex: 1.5 }] }, row.property),
      h(Text, { style: styles.tableCell }, row.tenantName),
      h(Text, { style: styles.tableCellSmall }, `R$ ${row.rentAmount.toFixed(2)}`),
      h(Text, { style: styles.tableCellSmall }, `${row.adminFeePct.toFixed(2)}%`),
      h(Text, { style: styles.tableCellSmall }, `R$ ${row.repasse.toFixed(2)}`),
      h(Text, { style: styles.tableCellSmall }, row.paidAtStr),
    ),
  )

  // Total row
  const totalRow = h(
    View,
    { style: [styles.tableRow, styles.tableRowTotal] },
    h(Text, { style: [styles.tableCell, { flex: 3.2 }] }, 'Total'),
    h(Text, { style: styles.tableCellSmall }, `R$ ${totalRepasse.toFixed(2)}`),
    h(Text, { style: styles.tableCellSmall }, ''),
  )

  return h(
    Document,
    {},
    h(
      Page,
      { size: 'A4', style: styles.page },
      h(View, { style: styles.header }, ...headerElements),
      h(View, { style: styles.ownerInfo }, ...ownerInfoElements),
      h(View, { style: styles.table }, tableHeaderRow, ...tableRows, totalRow),
      h(Text, { style: styles.footer }, `Gerado em ${generatedAt} — Tenora Gestão Imobiliária`),
    ),
  )
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

  const [owner, charges, tenant] = await Promise.all([
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
    rootDb.tenant.findUnique({
      where: { id: orgId },
      select: { logo: true },
    }),
  ])

  if (!owner) return NextResponse.json({ error: 'Proprietário não encontrado' }, { status: 404 })

  const ownerSlug = owner.name.toLowerCase().replace(/\s+/g, '-')

  const periodParts: string[] = []
  if (fromDate) periodParts.push(`De ${new Date(fromDate).toLocaleDateString('pt-BR')}`)
  if (toDate) periodParts.push(`até ${new Date(toDate).toLocaleDateString('pt-BR')}`)
  const period = periodParts.length > 0 ? periodParts.join(' ') : 'Todos os períodos'

  if (format === 'pdf') {
    const pdfDoc = generatePdfDocument(owner, charges as ChargeWithLease[], period, tenant?.logo)
    const stream = await renderToStream(pdfDoc)

    return new Response(stream as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="extrato-${ownerSlug}.pdf"`,
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
