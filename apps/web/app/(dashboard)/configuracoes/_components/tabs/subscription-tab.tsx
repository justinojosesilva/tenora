'use client'

import { useState, useTransition } from 'react'
import { Loader2, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createPortalSessionAction } from '../../../billing/actions'

type Plan = 'starter' | 'pro' | 'scale'

type Props = {
  currentPlan: Plan
  hasStripeCustomer: boolean
  hasActiveSubscription: boolean
}

const PLAN_NAMES: Record<Plan, string> = {
  starter: 'Starter',
  pro: 'Pro',
  scale: 'Scale',
}

const PLAN_FEATURES: Record<Plan, string[]> = {
  starter: ['Até 10 propriedades', 'Até 50 contratos', 'Suporte por email'],
  pro: ['Até 100 propriedades', 'Contratos ilimitados', 'Suporte prioritário'],
  scale: [
    'Propriedades ilimitadas',
    'Contratos ilimitados',
    'Suporte dedicado',
    'APIs customizadas',
  ],
}

export function SubscriptionTab({ currentPlan, hasStripeCustomer, hasActiveSubscription }: Props) {
  const [portalPending, setPortalPending] = useState(false)
  const [, startTransition] = useTransition()

  function handleOpenPortal() {
    setPortalPending(true)
    startTransition(async () => {
      await createPortalSessionAction()
      setPortalPending(false)
    })
  }

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Plano Atual</CardTitle>
          <CardDescription>Gerenciar sua assinatura</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/40 px-6 py-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Plano ativo</p>
                <p className="mt-0.5 text-2xl font-bold">{PLAN_NAMES[currentPlan]}</p>
                {!hasActiveSubscription && (
                  <p className="mt-2 text-xs text-amber-600 font-medium">⚠️ Sem assinatura ativa</p>
                )}
              </div>
              {hasStripeCustomer && hasActiveSubscription && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenPortal}
                  disabled={portalPending}
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

          {/* Plan Features */}
          <div>
            <p className="text-sm font-medium mb-3">Recursos inclusos:</p>
            <ul className="space-y-2">
              {PLAN_FEATURES[currentPlan].map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {!hasActiveSubscription && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
              <p className="text-sm text-amber-900">
                Acesse a{' '}
                <a href="/dashboard/billing" className="font-medium underline">
                  página de assinatura
                </a>{' '}
                para escolher um plano.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upgrade Info */}
      {currentPlan !== 'scale' && hasActiveSubscription && (
        <Card>
          <CardHeader>
            <CardTitle>Próximos passos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Conheça os benefícios de um plano superior e atualize sua assinatura quando
              necessário.
            </p>
            <a href="/dashboard/billing">
              <Button variant="outline">Ver planos disponíveis</Button>
            </a>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
