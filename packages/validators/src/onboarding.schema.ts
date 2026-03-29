import { z } from 'zod'

export const ONBOARDING_STEPS = [
  'dados_basicos',
  'primeiro_imovel',
  'primeiro_proprietario',
  'plano',
] as const

export const OnboardingStepSchema = z.enum(ONBOARDING_STEPS)

export const CompleteStepSchema = z.object({
  step: OnboardingStepSchema,
})

export const SkipStepSchema = z.object({
  step: OnboardingStepSchema,
})

export type OnboardingStep = z.infer<typeof OnboardingStepSchema>
export type CompleteStep = z.infer<typeof CompleteStepSchema>
export type SkipStep = z.infer<typeof SkipStepSchema>
