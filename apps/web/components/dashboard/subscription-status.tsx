'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type Props = {
  plan: 'starter' | 'pro' | 'scale'
  subscriptionId: string | null
  tenantStatus: string
}

const PLAN_DISPLAY = {
  starter: 'Starter',
  pro: 'Pro',
  scale: 'Scale',
}

export function SubscriptionStatus({ plan, subscriptionId, tenantStatus }: Props) {
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchTrialInfo() {
      if (!subscriptionId) {
        setLoading(false)
        return
      }

      try {
        const response = await fetch('/api/subscription-trial', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscriptionId }),
        })

        if (response.ok) {
          const data = await response.json()
          setTrialDaysLeft(data.daysLeft)
        }
      } catch (error) {
        console.error('Failed to fetch trial info:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTrialInfo()
  }, [subscriptionId])

  const isActive = tenantStatus === 'active'
  const isSuspended = tenantStatus === 'suspended'

  return (
    <Card
      className={
        isSuspended ? 'border-red-200 bg-red-50' : isActive ? 'border-green-200 bg-green-50' : ''
      }
    >
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-muted-foreground">Plano atual</p>
              {isActive && (
                <Badge variant="secondary" className="text-xs">
                  Ativo
                </Badge>
              )}
              {isSuspended && (
                <Badge variant="destructive" className="text-xs">
                  Suspenso
                </Badge>
              )}
            </div>
            <p className="text-lg font-bold">{PLAN_DISPLAY[plan]}</p>

            {!loading && trialDaysLeft !== null && trialDaysLeft > 0 && (
              <div className="mt-3 flex items-center gap-2 rounded-md bg-white/50 px-3 py-2 text-sm">
                <Clock className="h-4 w-4 shrink-0 text-orange-600" />
                <span className="text-orange-900">
                  {trialDaysLeft} dia{trialDaysLeft !== 1 ? 's' : ''} de trial restantes
                </span>
              </div>
            )}

            {isSuspended && (
              <div className="mt-3 flex items-center gap-2 rounded-md bg-white/50 px-3 py-2 text-sm">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                <span className="text-red-900">
                  Sua assinatura foi suspensa. Visite{' '}
                  <a href="/dashboard/billing" className="font-medium underline">
                    Assinatura
                  </a>{' '}
                  para reativar.
                </span>
              </div>
            )}
          </div>

          {isActive && <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />}
        </div>
      </CardContent>
    </Card>
  )
}
