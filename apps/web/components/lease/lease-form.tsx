'use client'

import { useEffect, useActionState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  createLeaseAction,
  updateLeaseAction,
  type LeaseFormState,
} from '@/app/(dashboard)/contratos/actions'

export type FormLeaseData = {
  id: string
  propertyId: string
  tenantName: string
  tenantCpf: string | null
  tenantEmail: string | null
  tenantPhone: string | null
  rentAmount: string
  adminFeePct: string
  readjustIndex: string | null
  dueDayOfMonth: number
  startDate: string
  endDate: string
  signedAt: string | null
}

type PropertyOption = {
  id: string
  address: string
  city: string | null
  status: string
}

type Props = {
  lease?: FormLeaseData
  properties: PropertyOption[]
  canWrite: boolean
  onSuccess?: () => void
}

function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return ''
  return iso.substring(0, 10)
}

export function LeaseForm({ lease, properties, canWrite, onSuccess }: Props) {
  const isEdit = !!lease?.id
  const action = isEdit ? updateLeaseAction : createLeaseAction

  const [state, formAction, isPending] = useActionState<LeaseFormState, FormData>(action, null)

  useEffect(() => {
    if (state?.success) onSuccess?.()
  }, [state?.success]) // eslint-disable-line react-hooks/exhaustive-deps

  const err = (field: string) => state?.fieldErrors?.[field]?.[0]

  const availableProperties = isEdit
    ? properties
    : properties.filter((p) => p.status === 'available')

  const selectClass =
    'h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50'

  return (
    <form action={formAction} className="space-y-4 overflow-y-auto p-5">
      {isEdit && <input type="hidden" name="id" value={lease.id} />}

      {state?.error && !state.fieldErrors && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="lf-propertyId">Imóvel *</Label>
        <select
          id="lf-propertyId"
          name="propertyId"
          defaultValue={lease?.propertyId ?? ''}
          disabled={!canWrite || isPending || isEdit}
          className={selectClass}
          required
        >
          <option value="">Selecione um imóvel...</option>
          {availableProperties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.address}
              {p.city ? ` — ${p.city}` : ''}
            </option>
          ))}
        </select>
        {err('propertyId') && <p className="text-xs text-destructive">{err('propertyId')}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="lf-tenantName">Nome do Inquilino *</Label>
        <Input
          id="lf-tenantName"
          name="tenantName"
          defaultValue={lease?.tenantName ?? ''}
          disabled={!canWrite || isPending}
          placeholder="Maria Souza"
        />
        {err('tenantName') && <p className="text-xs text-destructive">{err('tenantName')}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="lf-tenantCpf">CPF do Inquilino</Label>
          <Input
            id="lf-tenantCpf"
            name="tenantCpf"
            defaultValue={lease?.tenantCpf ?? ''}
            disabled={!canWrite || isPending}
            placeholder="000.000.000-00"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lf-tenantPhone">Telefone</Label>
          <Input
            id="lf-tenantPhone"
            name="tenantPhone"
            type="tel"
            defaultValue={lease?.tenantPhone ?? ''}
            disabled={!canWrite || isPending}
            placeholder="(11) 99999-9999"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="lf-tenantEmail">E-mail do Inquilino</Label>
        <Input
          id="lf-tenantEmail"
          name="tenantEmail"
          type="email"
          defaultValue={lease?.tenantEmail ?? ''}
          disabled={!canWrite || isPending}
          placeholder="maria@email.com"
        />
        {err('tenantEmail') && <p className="text-xs text-destructive">{err('tenantEmail')}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="lf-rentAmount">Valor do Aluguel (R$) *</Label>
          <Input
            id="lf-rentAmount"
            name="rentAmount"
            type="number"
            step="0.01"
            min="0"
            defaultValue={lease?.rentAmount ?? ''}
            disabled={!canWrite || isPending}
            placeholder="1500.00"
          />
          {err('rentAmount') && <p className="text-xs text-destructive">{err('rentAmount')}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lf-adminFeePct">Taxa Admin. (%)</Label>
          <Input
            id="lf-adminFeePct"
            name="adminFeePct"
            type="number"
            step="0.1"
            min="0"
            max="100"
            defaultValue={lease?.adminFeePct ?? '10'}
            disabled={!canWrite || isPending}
            placeholder="10"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="lf-dueDayOfMonth">Dia de Vencimento</Label>
          <Input
            id="lf-dueDayOfMonth"
            name="dueDayOfMonth"
            type="number"
            min="1"
            max="28"
            defaultValue={lease?.dueDayOfMonth ?? '5'}
            disabled={!canWrite || isPending}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lf-readjustIndex">Índice de Reajuste</Label>
          <Input
            id="lf-readjustIndex"
            name="readjustIndex"
            defaultValue={lease?.readjustIndex ?? 'IGPM'}
            disabled={!canWrite || isPending}
            placeholder="IGPM"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="lf-startDate">Início da Vigência *</Label>
          <Input
            id="lf-startDate"
            name="startDate"
            type="date"
            defaultValue={toDateInputValue(lease?.startDate)}
            disabled={!canWrite || isPending}
          />
          {err('startDate') && <p className="text-xs text-destructive">{err('startDate')}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lf-endDate">Fim da Vigência *</Label>
          <Input
            id="lf-endDate"
            name="endDate"
            type="date"
            defaultValue={toDateInputValue(lease?.endDate)}
            disabled={!canWrite || isPending}
          />
          {err('endDate') && <p className="text-xs text-destructive">{err('endDate')}</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="lf-signedAt">Data de Assinatura</Label>
        <Input
          id="lf-signedAt"
          name="signedAt"
          type="date"
          defaultValue={toDateInputValue(lease?.signedAt)}
          disabled={!canWrite || isPending}
        />
      </div>

      {canWrite && (
        <div className="flex justify-end pt-2">
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Cadastrar contrato'}
          </Button>
        </div>
      )}
    </form>
  )
}
