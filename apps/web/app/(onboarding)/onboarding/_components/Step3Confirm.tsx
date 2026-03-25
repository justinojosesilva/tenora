'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Step3ConfirmProps {
  companyName: string
  cnpj: string
  nProperties: number
  bankSlug: string | null
  loading: boolean
  error: string | null
  onConfirm: () => void
  onBack: () => void
}

export function Step3Confirm({
  companyName,
  cnpj,
  nProperties,
  bankSlug,
  loading,
  error,
  onConfirm,
  onBack,
}: Step3ConfirmProps) {
  return (
    <Card className="w-full max-w-lg border-0 shadow-lg">
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Confirmação Final</CardTitle>
        <CardDescription>Revise os dados antes de criar sua conta na Tenora.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="rounded-lg border bg-muted/50 p-4">
          <dl className="flex flex-col gap-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Imobiliária</dt>
              <dd className="font-medium">{companyName}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">CNPJ</dt>
              <dd className="font-mono font-medium">{cnpj}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Imóveis gerenciados</dt>
              <dd className="font-medium">{nProperties}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Conexão bancária</dt>
              <dd>
                {bankSlug ? (
                  <Badge variant="secondary" className="capitalize">
                    {bankSlug}
                  </Badge>
                ) : (
                  <Badge variant="outline">Manual</Badge>
                )}
              </dd>
            </div>
          </dl>
        </div>

        {error && <p className="text-center text-sm text-destructive">{error}</p>}

        <Button onClick={onConfirm} disabled={loading} className="w-full" size="lg">
          {loading ? 'Criando sua conta…' : 'Criar minha conta'}
        </Button>

        <Button variant="ghost" onClick={onBack} disabled={loading} size="sm">
          &larr; Voltar
        </Button>
      </CardContent>
    </Card>
  )
}
