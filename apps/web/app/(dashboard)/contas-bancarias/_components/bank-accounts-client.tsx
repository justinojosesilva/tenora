'use client'

import { useState, useCallback } from 'react'
import { useAuth } from '@clerk/nextjs'
import { PluggyConnect } from 'react-pluggy-connect'
import { Building2, Trash2, RefreshCw, AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

type BankConnection = {
  id: string
  pluggyItemId: string
  status: string
  lastSyncedAt: string | null
}

type BankAccount = {
  id: string
  name: string
  bankCode: string
  agency: string | null
  accountNumber: string | null
  accountType: string
  isPrimary: boolean
  bankConnection: BankConnection | null
}

interface BankAccountsClientProps {
  accounts: BankAccount[]
  isAdmin: boolean
}

function statusBadge(status: string) {
  switch (status) {
    case 'active':
      return (
        <Badge
          variant="secondary"
          className="gap-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
        >
          <CheckCircle2 className="h-3 w-3" />
          Ativa
        </Badge>
      )
    case 'error':
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertCircle className="h-3 w-3" />
          Erro
        </Badge>
      )
    case 'outdated':
      return (
        <Badge variant="outline" className="gap-1 text-yellow-700 border-yellow-400">
          <Clock className="h-3 w-3" />
          Desatualizada
        </Badge>
      )
    case 'waiting_user_input':
      return (
        <Badge variant="outline" className="gap-1 text-blue-700 border-blue-400">
          <Clock className="h-3 w-3" />
          Aguardando
        </Badge>
      )
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

function formatLastSync(date: string | null): string {
  if (!date) return 'Nunca sincronizado'
  return `Última sinc: ${new Date(date).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })}`
}

export function BankAccountsClient({
  accounts: initialAccounts,
  isAdmin,
}: BankAccountsClientProps) {
  const { getToken } = useAuth()
  const [accounts, setAccounts] = useState<BankAccount[]>(initialAccounts)
  const [connectToken, setConnectToken] = useState<string | null>(null)
  const [isOpeningWidget, setIsOpeningWidget] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refreshList = useCallback(async () => {
    const token = await getToken()
    const res = await fetch('/api/bank-account/list', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      const data = await res.json()
      setAccounts(data)
    }
  }, [getToken])

  async function handleOpenWidget() {
    setError(null)
    setIsOpeningWidget(true)
    try {
      const token = await getToken()
      const res = await fetch('/api/bank-account/connect-token', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Falha ao obter token de conexão')
      const data = await res.json()
      setConnectToken(data.token)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao abrir widget')
      setIsOpeningWidget(false)
    }
  }

  async function handlePluggySuccess({
    item,
  }: {
    item: { id: string; connector: { id: number; name: string } }
  }) {
    setConnectToken(null)
    setIsOpeningWidget(false)
    try {
      const token = await getToken()
      const res = await fetch('/api/bank-account/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pluggyItemId: item.id,
          name: item.connector.name,
          bankCode: String(item.connector.id),
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        setError(err.error ?? 'Erro ao registrar conta')
        return
      }
      await refreshList()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao conectar conta')
    }
  }

  function handlePluggyClose() {
    setConnectToken(null)
    setIsOpeningWidget(false)
  }

  function handlePluggyError({ message }: { message: string }) {
    setConnectToken(null)
    setIsOpeningWidget(false)
    setError(message || 'Erro na conexão com o banco')
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    setError(null)
    try {
      const token = await getToken()
      const res = await fetch('/api/bank-account/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) {
        const err = await res.json()
        setError(err.error ?? 'Erro ao remover conta')
        return
      }
      setAccounts((prev) => prev.filter((a) => a.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover conta')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <>
      {connectToken && (
        <PluggyConnect
          connectToken={connectToken}
          onSuccess={handlePluggySuccess}
          onClose={handlePluggyClose}
          onError={handlePluggyError}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contas Bancárias</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie as contas conectadas via Open Finance
          </p>
        </div>
        {isAdmin && (
          <Button onClick={handleOpenWidget} disabled={isOpeningWidget}>
            {isOpeningWidget ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Carregando…
              </>
            ) : (
              <>
                <Building2 className="mr-2 h-4 w-4" />
                Conectar conta
              </>
            )}
          </Button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {accounts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Building2 className="mb-4 h-12 w-12 text-muted-foreground/40" />
            <p className="font-medium text-muted-foreground">Nenhuma conta conectada</p>
            <p className="mt-1 text-sm text-muted-foreground/70">
              {isAdmin
                ? 'Clique em "Conectar conta" para vincular sua conta bancária via Open Finance.'
                : 'Nenhuma conta bancária foi conectada ainda.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {accounts.map((account) => (
            <Card key={account.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 shrink-0 text-muted-foreground" />
                    <CardTitle className="text-base leading-tight">{account.name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {account.isPrimary && (
                      <Badge variant="default" className="text-xs">
                        Principal
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {account.accountType === 'savings' ? 'Poupança' : 'Corrente'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  {account.accountNumber && <span>Conta: {account.accountNumber}</span>}
                  {account.agency && <span>Agência: {account.agency}</span>}
                  <span>Cód: {account.bankCode}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    {account.bankConnection ? (
                      <>
                        {statusBadge(account.bankConnection.status)}
                        <p className="text-xs text-muted-foreground">
                          {formatLastSync(account.bankConnection.lastSyncedAt)}
                        </p>
                      </>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        Não conectada
                      </Badge>
                    )}
                  </div>

                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      disabled={deletingId === account.id}
                      onClick={() => handleDelete(account.id)}
                    >
                      {deletingId === account.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  )
}

export function BankAccountsClientSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-3">
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-6 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
