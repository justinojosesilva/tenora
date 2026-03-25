'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CNPJInput } from '@/components/cnpj-input'

interface Step1Data {
  companyName: string
  cnpj: string
  nProperties: number
}

interface Step1CompanyProps {
  data: Step1Data
  onNext: (data: Step1Data) => void
}

export function Step1Company({ data, onNext }: Step1CompanyProps) {
  const [companyName, setCompanyName] = useState(data.companyName)
  const [cnpj, setCnpj] = useState(data.cnpj)
  const [nProperties, setNProperties] = useState(data.nProperties)
  const [cnpjValid, setCnpjValid] = useState(false)

  const canProceed = companyName.trim().length >= 3 && cnpjValid && nProperties > 0

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canProceed) return
    onNext({ companyName: companyName.trim(), cnpj, nProperties })
  }

  return (
    <Card className="w-full max-w-lg border-0 shadow-lg">
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Informações da Imobiliária</CardTitle>
        <CardDescription>
          Preencha os dados básicos da sua imobiliária para começar.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="companyName">Nome da imobiliária</Label>
            <Input
              id="companyName"
              placeholder="Ex: Imobiliária Central"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="cnpj">CNPJ</Label>
            <CNPJInput id="cnpj" value={cnpj} onChange={setCnpj} onValidChange={setCnpjValid} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="nProperties">Quantidade de imóveis gerenciados</Label>
            <Input
              id="nProperties"
              type="number"
              min={1}
              placeholder="Ex: 50"
              value={nProperties || ''}
              onChange={(e) => setNProperties(Number(e.target.value))}
            />
          </div>

          <Button type="submit" disabled={!canProceed} className="mt-2 w-full" size="lg">
            Continuar
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
