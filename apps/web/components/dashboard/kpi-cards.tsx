'use client'

import Link from 'next/link'
import { Building2, Home, ScrollText, Receipt } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type Props = {
  totalProperties: number
  rentedProperties: number
  activeLeases: number
  pendingCharges: number
}

const buildKpis = (props: Props) => [
  {
    label: 'Total de Imóveis',
    value: props.totalProperties,
    icon: Building2,
    href: '/imoveis',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  {
    label: 'Imóveis Alugados',
    value: props.rentedProperties,
    icon: Home,
    href: '/imoveis?status=rented',
    color: 'text-[#1D9E75]',
    bgColor: 'bg-[#1D9E75]/10',
  },
  {
    label: 'Contratos Ativos',
    value: props.activeLeases,
    icon: ScrollText,
    href: '/contratos?status=active',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  {
    label: 'Cobranças Em Aberto',
    value: props.pendingCharges,
    icon: Receipt,
    href: '/cobrancas?status=pending',
    color: 'text-[#E24B4A]',
    bgColor: 'bg-[#E24B4A]/10',
  },
]

export function KpiCards(props: Props) {
  const kpis = buildKpis(props)

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi) => {
        const Icon = kpi.icon
        return (
          <Link key={kpi.label} href={kpi.href} className="group">
            <Card className="transition-shadow hover:shadow-md cursor-pointer h-full">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {kpi.label}
                  </CardTitle>
                  <div className={`rounded-md p-2 ${kpi.bgColor}`}>
                    <Icon className={`h-4 w-4 ${kpi.color}`} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
              </CardContent>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}
