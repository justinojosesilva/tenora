'use client'

import { useState, useTransition } from 'react'
import { useOrganizationList } from '@clerk/nextjs'
import { StepIndicator } from '@/components/step-indicator'
import { Step1Company } from './Step1Company'
import { Step2Bank } from './Step2Bank'
import { Step3Confirm } from './Step3Confirm'
import { createOrganizationAction, completeOnboardingAction } from '../actions'

const STEPS = [
  { label: 'Informações da Imobiliária' },
  { label: 'Conexão Bancária' },
  { label: 'Configuração Final' },
]

interface CompanyData {
  companyName: string
  cnpj: string
  nProperties: number
}

export function OnboardingWizard() {
  const { setActive } = useOrganizationList()
  const [isPending, startTransition] = useTransition()

  const [step, setStep] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // Step 1 data
  const [companyData, setCompanyData] = useState<CompanyData>({
    companyName: '',
    cnpj: '',
    nProperties: 0,
  })

  // Step 2 data
  const [bankSlug, setBankSlug] = useState<string | null>(null)

  function handleStep1(data: CompanyData) {
    setCompanyData(data)
    setStep(1)
  }

  function handleStep2(bank: string | null) {
    setBankSlug(bank)
    setStep(2)
  }

  function handleConfirm() {
    setError(null)
    startTransition(async () => {
      // Step 1: Criar organização no Clerk
      const result = await createOrganizationAction(
        companyData.companyName,
        companyData.cnpj,
        companyData.nProperties,
      )

      if (!result.success) {
        setError(result.error)
        return
      }

      const newOrgId = result.orgId

      // Step 2: Completar onboarding com dados do banco
      const completeResult = await completeOnboardingAction(newOrgId, bankSlug)
      if (!completeResult.success) {
        setError(completeResult.error ?? 'Erro ao finalizar.')
        return
      }

      // Step 3: Ativar a organização — hard navigation para garantir sessão atualizada
      if (setActive) {
        await setActive({ organization: newOrgId })
      }

      window.location.assign('/dashboard')
    })
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-background px-4 py-10">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-primary">Tenora</h1>
      </div>

      <StepIndicator steps={STEPS} currentStep={step} className="mb-10" />

      {step === 0 && <Step1Company data={companyData} onNext={handleStep1} />}

      {step === 1 && (
        <Step2Bank selectedBank={bankSlug} onNext={handleStep2} onBack={() => setStep(0)} />
      )}

      {step === 2 && (
        <Step3Confirm
          companyName={companyData.companyName}
          cnpj={companyData.cnpj}
          nProperties={companyData.nProperties}
          bankSlug={bankSlug}
          loading={isPending}
          error={error}
          onConfirm={handleConfirm}
          onBack={() => setStep(1)}
        />
      )}
    </div>
  )
}
