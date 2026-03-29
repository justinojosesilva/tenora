'use client'

import { useState, useTransition } from 'react'
import { Check, Loader2, ExternalLink, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { createCheckoutSessionAction, createPortalSessionAction } from '../actions'

type Plan = 'starter' | 'pro' | 'scale'

const PLANS: Array<{
  id: Plan
  name: string
  price: string
  description: string
  features: string[]
  highlight?: boolean
}> = [
  {
    id: 'starter',
    name: 'Starter',
    price: 'R$ 397/mês',
    description: 'Ideal para imobiliárias em crescimento',
    features: [
      'Até 50 imóveis',
      'Gestão de contratos e cobranças',
      'Relatórios básicos',
      'Suporte via e-mail',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 'R$ 697/mês',
    description: 'Para imobiliárias que precisam de mais poder',
    features: [
      'Até 200 imóveis',
      'Tudo do Starter',
      'Integração bancária (Open Finance)',
      'Relatórios avançados e DRE',
      'Suporte prioritário',
    ],
    highlight: true,
  },
  {
    id: 'scale',
    name: 'Scale',
    price: 'R$ 1.197/mês',
    description: 'Para grandes imobiliárias e redes',
    features: [
      'Imóveis ilimitados',
      'Tudo do Pro',
      'Múltiplos usuários e perfis',
      'API de integração',
      'Gerente de conta dedicado',
    ],
  },
]

type Props = {
  currentPlan: Plan
  hasStripeCustomer: boolean
  hasActiveSubscription: boolean
  successMessage: boolean
  canceledMessage: boolean
}

export function BillingPageClient({
  currentPlan,
  hasStripeCustomer,
  hasActiveSubscription,
  successMessage,
  canceledMessage,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [pendingPlan, setPendingPlan] = useState<Plan | null>(null)
  const [portalPending, setPortalPending] = useState(false)

  function handleSelectPlan(plan: Plan) {
    setPendingPlan(plan)
    startTransition(async () => {
      await createCheckoutSessionAction(plan)
      setPendingPlan(null)
    })
  }

  function handleOpenPortal() {
    setPortalPending(true)
    startTransition(async () => {
      await createPortalSessionAction()
      setPortalPending(false)
    })
  }

  return (
    <div className="space-y-8">
      {successMessage && (
        <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Assinatura ativada com sucesso! Bem-vindo ao Tenora.
        </div>
      )}
      {canceledMessage && (
        <div className="flex items-center gap-2 rounded-md border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          <AlertCircle className="h-4 w-4 shrink-0" />O processo de pagamento foi cancelado. Você
          pode tentar novamente a qualquer momento.
        </div>
      )}

      {/* Plano atual */}
      <div className="rounded-lg border bg-muted/40 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Plano atual</p>
            <p className="mt-0.5 text-xl font-bold capitalize">{currentPlan}</p>
            {!hasActiveSubscription && (
              <p className="mt-1 text-xs text-muted-foreground">
                Sem assinatura ativa — escolha um plano abaixo para continuar usando o Tenora.
              </p>
            )}
          </div>
          {hasStripeCustomer && hasActiveSubscription && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenPortal}
              disabled={portalPending || isPending}
            >
              {portalPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="mr-2 h-4 w-4" />
              )}
              Gerenciar assinatura
            </Button>
          )}
        </div>
      </div>

      {/* Cards de planos */}
      <div className="grid gap-6 md:grid-cols-3">
        {PLANS.map((plan) => {
          const isActive = currentPlan === plan.id && hasActiveSubscription
          const isLoading = pendingPlan === plan.id && isPending

          return (
            <Card
              key={plan.id}
              className={cn(
                'relative flex flex-col',
                plan.highlight && 'border-primary shadow-md',
                isActive && 'ring-2 ring-primary',
              )}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">Mais popular</Badge>
                </div>
              )}
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center justify-between">
                  {plan.name}
                  {isActive && (
                    <Badge variant="secondary" className="text-xs">
                      Ativo
                    </Badge>
                  )}
                </CardTitle>
                <p className="text-2xl font-bold">{plan.price}</p>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col justify-between gap-6">
                <ul className="space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={plan.highlight ? 'default' : 'outline'}
                  disabled={isActive || isPending}
                  onClick={() => handleSelectPlan(plan.id)}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Redirecionando...
                    </>
                  ) : isActive ? (
                    'Plano atual'
                  ) : (
                    'Assinar — 14 dias grátis'
                  )}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Todos os planos incluem 14 dias de trial gratuito, sem necessidade de cartão de crédito.
      </p>
    </div>
  )
}
