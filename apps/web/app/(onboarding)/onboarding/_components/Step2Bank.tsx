'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const BANKS = [
  { slug: 'itau', name: 'Itaú', color: '#EC7000' },
  { slug: 'bradesco', name: 'Bradesco', color: '#CC092F' },
  { slug: 'santander', name: 'Santander', color: '#EC0000' },
  { slug: 'bb', name: 'Banco do Brasil', color: '#FDCB00' },
  { slug: 'caixa', name: 'Caixa', color: '#005CA9' },
  { slug: 'nubank', name: 'Nubank', color: '#820AD1' },
  { slug: 'sicoob', name: 'Sicoob', color: '#003641' },
  { slug: 'outros', name: 'Outros', color: '#6B7280' },
] as const

interface Step2BankProps {
  selectedBank: string | null
  onNext: (bank: string | null) => void
  onBack: () => void
}

export function Step2Bank({ selectedBank, onNext, onBack }: Step2BankProps) {
  const [selected, setSelected] = useState<string | null>(selectedBank)

  return (
    <Card className="w-full max-w-lg border-0 shadow-lg">
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Conecte a conta PJ da sua imobiliária</CardTitle>
        <CardDescription>
          Utilizamos o ecossistema Open Finance Brasil para importar seus dados com máxima segurança
          e precisão. Escolha sua instituição abaixo.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="grid grid-cols-4 gap-3">
          {BANKS.map((bank) => (
            <button
              key={bank.slug}
              type="button"
              onClick={() => setSelected(bank.slug)}
              className={cn(
                'flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-all hover:border-primary/50',
                selected === bank.slug
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-border bg-card',
              )}
            >
              <div
                className="flex h-10 w-10 items-center justify-center rounded-md text-sm font-bold text-white"
                style={{ backgroundColor: bank.color }}
              >
                {bank.name.charAt(0)}
              </div>
              <span className="text-xs font-medium text-foreground">{bank.name}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <Button
            onClick={() => onNext(selected)}
            disabled={!selected}
            className="w-full"
            size="lg"
          >
            Conectar banco selecionado
          </Button>
          <Button variant="link" onClick={() => onNext(null)} className="text-sm">
            Conectar manualmente &rarr;
          </Button>
        </div>

        <Button variant="ghost" onClick={onBack} size="sm">
          &larr; Voltar
        </Button>

        <div className="flex items-center justify-center gap-6 border-t pt-4 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            SEGURANCA AES-256 bits
          </span>
          <span className="flex items-center gap-1">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Open Finance Brasil
          </span>
          <span className="flex items-center gap-1">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            LGPD Compliant
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
