'use client'

import { cn } from '@/lib/utils'

interface Step {
  label: string
}

interface StepIndicatorProps {
  steps: Step[]
  currentStep: number
  className?: string
}

export function StepIndicator({ steps, currentStep, className }: StepIndicatorProps) {
  return (
    <nav className={cn('flex items-center justify-center gap-0', className)}>
      {steps.map((step, index) => {
        const isActive = index === currentStep
        const isCompleted = index < currentStep

        return (
          <div key={step.label} className="flex items-center">
            {index > 0 && (
              <div className={cn('h-px w-12 sm:w-20', isCompleted ? 'bg-primary' : 'bg-border')} />
            )}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                  isActive && 'bg-primary text-primary-foreground',
                  isCompleted && 'bg-primary text-primary-foreground',
                  !isActive && !isCompleted && 'bg-muted text-muted-foreground',
                )}
              >
                {isCompleted ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path
                      d="M11.5 3.5L5.5 10L2.5 7"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              <span
                className={cn(
                  'text-xs font-medium whitespace-nowrap',
                  isActive ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                {step.label}
              </span>
            </div>
          </div>
        )
      })}
    </nav>
  )
}
