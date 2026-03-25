import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const metadata = { title: 'Dashboard — Tenora' }

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">Bom dia!</h1>
        <Badge variant="secondary">Onboarding completo</Badge>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Bem-vindo ao Tenora. O dashboard completo será implementado na próxima sprint.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Receita Bruta', value: 'R$ 0,00', color: 'text-green-600' },
          { label: 'Repasse Proprietários', value: 'R$ 0,00', color: 'text-blue-600' },
          { label: 'Despesas Operacionais', value: 'R$ 0,00', color: 'text-orange-600' },
          { label: 'Lucro Líquido', value: 'R$ 0,00', color: 'text-emerald-600' },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {kpi.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
