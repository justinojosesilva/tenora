'use client'

import { forwardRef, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

// Formata CNPJ: 12.345.678/0001-90
function formatCNPJ(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14)
  if (digits.length <= 2) return digits
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`
  if (digits.length <= 12)
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`
}

// Valida dígitos verificadores do CNPJ
export function validateCNPJ(cnpj: string): boolean {
  const digits = cnpj.replace(/\D/g, '')
  if (digits.length !== 14) return false

  // Rejeitar todos iguais
  if (/^(\d)\1{13}$/.test(digits)) return false

  const calc = (slice: string, weights: number[]) => {
    const sum = slice.split('').reduce((acc, d, i) => acc + Number(d) * (weights[i] ?? 0), 0)
    const remainder = sum % 11
    return remainder < 2 ? 0 : 11 - remainder
  }

  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]

  const d1 = calc(digits.slice(0, 12), w1)
  const d2 = calc(digits.slice(0, 13), w2)

  return Number(digits[12]) === d1 && Number(digits[13]) === d2
}

interface CNPJInputProps extends Omit<React.ComponentProps<typeof Input>, 'onChange'> {
  value: string
  onChange: (value: string) => void
  onValidChange?: (valid: boolean) => void
}

export const CNPJInput = forwardRef<HTMLInputElement, CNPJInputProps>(function CNPJInput(
  { value, onChange, onValidChange, className, ...props },
  ref,
) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatCNPJ(e.target.value)
      onChange(formatted)
      const digits = formatted.replace(/\D/g, '')
      if (digits.length === 14) {
        onValidChange?.(validateCNPJ(formatted))
      } else {
        onValidChange?.(false)
      }
    },
    [onChange, onValidChange],
  )

  const digits = value.replace(/\D/g, '')
  const isComplete = digits.length === 14
  const isValid = isComplete && validateCNPJ(value)

  return (
    <div className="relative">
      <Input
        ref={ref}
        type="text"
        inputMode="numeric"
        placeholder="00.000.000/0001-00"
        maxLength={18}
        value={value}
        onChange={handleChange}
        className={cn(
          isComplete && !isValid && 'border-destructive focus-visible:ring-destructive',
          isComplete && isValid && 'border-green-500 focus-visible:ring-green-500',
          className,
        )}
        {...props}
      />
      {isComplete && (
        <span
          className={cn(
            'absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium',
            isValid ? 'text-green-600' : 'text-destructive',
          )}
        >
          {isValid ? 'Válido' : 'Inválido'}
        </span>
      )}
    </div>
  )
})
