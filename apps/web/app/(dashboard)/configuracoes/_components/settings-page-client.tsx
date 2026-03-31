'use client'

import { useState } from 'react'
import { Tabs } from '@/components/ui/tabs'
import { GeneralTab } from './tabs/general-tab'
import { SubscriptionTab } from './tabs/subscription-tab'
import { BankIntegrationTab } from './tabs/bank-integration-tab'

type Plan = 'starter' | 'pro' | 'scale'

type Props = {
  currentPlan: Plan
  hasStripeCustomer: boolean
  hasActiveSubscription: boolean
  tenantName: string
  tenantCnpj: string | null
  tenantLogo: string | null
  tenantContactEmail: string | null
}

export function SettingsPageClient({
  currentPlan,
  hasStripeCustomer,
  hasActiveSubscription,
  tenantName,
  tenantCnpj,
  tenantLogo,
  tenantContactEmail,
}: Props) {
  const [activeTab, setActiveTab] = useState('geral')

  return (
    <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col">
      <Tabs.List className="grid grid-cols-3">
        <Tabs.Tab value="geral">Geral</Tabs.Tab>
        <Tabs.Tab value="assinatura">Assinatura</Tabs.Tab>
        <Tabs.Tab value="banco">Integ. Bancária</Tabs.Tab>
      </Tabs.List>

      <Tabs.Panel value="geral" className="mt-6">
        <GeneralTab
          initialName={tenantName}
          initialCnpj={tenantCnpj}
          initialLogo={tenantLogo}
          initialContactEmail={tenantContactEmail}
        />
      </Tabs.Panel>

      <Tabs.Panel value="assinatura" className="mt-6">
        <SubscriptionTab
          currentPlan={currentPlan}
          hasStripeCustomer={hasStripeCustomer}
          hasActiveSubscription={hasActiveSubscription}
        />
      </Tabs.Panel>

      <Tabs.Panel value="banco" className="mt-6">
        <BankIntegrationTab />
      </Tabs.Panel>
    </Tabs.Root>
  )
}
