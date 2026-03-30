'use client'

import { useState, useTransition } from 'react'
import { Loader2, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createPortalSessionAction } from '../../billing/actions'

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

export function SettingsPageClient({
  currentPlan,
  hasStripeCustomer,
  hasActiveSubscription,
}: Props) {
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
    <div className="space-y-8">
      {/* Assinatura */}
      <Card>
        <CardHeader>
          <CardTitle>Assinatura</CardTitle>
          <CardDescription>Gerencie o plano da sua imobiliária</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/40 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Plano atual</p>
                <p className="mt-0.5 text-xl font-bold">{PLAN_NAMES[currentPlan]}</p>
                {!hasActiveSubscription && (
                  <p className="mt-1 text-xs text-muted-foreground">Sem assinatura ativa</p>
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
          {!hasActiveSubscription && (
            <p className="text-sm text-muted-foreground">
              Acesse a{' '}
              <a href="/dashboard/billing" className="font-medium underline">
                página de assinatura
              </a>{' '}
              para escolher um plano.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Informações da conta */}
      <Card>
        <CardHeader>
          <CardTitle>Informações da conta</CardTitle>
          <CardDescription>Detalhes básicos da sua imobiliária</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Para gerenciar membros da equipe, acesse{' '}
            <a href="/dashboard/settings/members" className="font-medium underline">
              Membros
            </a>
            .
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
