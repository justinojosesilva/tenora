'use client'

import { useEffect, useState } from 'react'
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@clerk/nextjs'

type BankAccount = {
  id: string
  name: string
  bankCode: string
  agency: string | null
  accountNumber: string | null
  accountType: string
  isPrimary: boolean
  bankConnection: {
    id: string
    status: string
    lastSyncedAt: string | null
  } | null
}

export function BankIntegrationTab() {
  const { getToken } = useAuth()
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchBankAccounts = async () => {
      try {
        const token = await getToken()
        if (!token) return

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
        const response = await fetch(`${apiUrl}/trpc/settings.getBankAccounts`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          setBankAccounts(data.result?.data || [])
        }
      } catch (error) {
        console.error('Erro ao buscar contas bancárias:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchBankAccounts()
  }, [getToken])

  const handleConnectBank = () => {
    // TODO: Implement Pluggy Connect integration
    alert('Integração com Pluggy em breve')
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Contas Bancárias Vinculadas</CardTitle>
          <CardDescription>
            Gerencie as contas bancárias conectadas ao Tenora via Pluggy
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : bankAccounts.length === 0 ? (
            <div className="rounded-lg border border-dashed py-8 text-center">
              <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm font-medium text-muted-foreground">
                Nenhuma conta bancária vinculada
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1 mb-4">
                Conecte uma conta bancária para sincronizar transações automaticamente
              </p>
              <Button onClick={handleConnectBank} size="sm">
                Conectar conta bancária
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {bankAccounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{account.name}</p>
                      {account.isPrimary && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                          Principal
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {account.agency && `Agência: ${account.agency} · `}
                      {account.accountNumber && `Conta: ${account.accountNumber}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {account.bankConnection ? (
                      <div className="flex items-center gap-1 text-xs">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="text-green-600 font-medium">Sincronizada</span>
                        {account.bankConnection.lastSyncedAt && (
                          <span className="text-muted-foreground">
                            (
                            {new Date(account.bankConnection.lastSyncedAt).toLocaleDateString(
                              'pt-BR',
                            )}
                            )
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-xs">
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                        <span className="text-amber-600 font-medium">Pendente</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <Button onClick={handleConnectBank} variant="outline" className="w-full mt-4">
                Adicionar outra conta
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sobre a integração</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            As contas bancárias são sincronizadas através do Pluggy, um serviço de agregação
            bancária que permite acessar dados de forma segura.
          </p>
          <p>
            As transações são sincronizadas a cada 6 horas automaticamente. Você pode também
            sincronizar manualmente a qualquer momento.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
