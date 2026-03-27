'use client'

import { useEffect, useActionState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  createPropertyAction,
  updatePropertyAction,
  type PropertyFormState,
} from '@/app/(dashboard)/imoveis/actions'

export type FormOwner = { id: string; name: string }

export type FormProperty = {
  id: string
  address: string
  city: string | null
  state: string | null
  zipCode: string | null
  type: string
  area: string | null
  rentAmount: string | null
  adminFeePct: string
  ownerId: string | null
}

type Props = {
  property?: FormProperty
  owners: FormOwner[]
  canEdit: boolean
  onSuccess?: () => void
}

const selectCls =
  'w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50'

export function PropertyForm({ property, owners, canEdit, onSuccess }: Props) {
  const isEdit = !!property?.id
  const action = isEdit ? updatePropertyAction : createPropertyAction

  const [state, formAction, isPending] = useActionState<PropertyFormState, FormData>(action, null)

  useEffect(() => {
    if (state?.success) onSuccess?.()
  }, [state?.success]) // eslint-disable-line react-hooks/exhaustive-deps

  const err = (field: string) => state?.fieldErrors?.[field]?.[0]

  return (
    <form action={formAction} className="space-y-4 overflow-y-auto p-5">
      {isEdit && <input type="hidden" name="id" value={property.id} />}

      {state?.error && !state.fieldErrors && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="pf-address">Endereço *</Label>
        <Input
          id="pf-address"
          name="address"
          defaultValue={property?.address ?? ''}
          disabled={!canEdit || isPending}
          placeholder="Rua das Flores, 123"
        />
        {err('address') && <p className="text-xs text-destructive">{err('address')}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="pf-city">Cidade</Label>
          <Input
            id="pf-city"
            name="city"
            defaultValue={property?.city ?? ''}
            disabled={!canEdit || isPending}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pf-state">Estado</Label>
          <Input
            id="pf-state"
            name="state"
            defaultValue={property?.state ?? ''}
            disabled={!canEdit || isPending}
            maxLength={2}
            placeholder="SP"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="pf-zipCode">CEP</Label>
        <Input
          id="pf-zipCode"
          name="zipCode"
          defaultValue={property?.zipCode ?? ''}
          disabled={!canEdit || isPending}
          placeholder="00000-000"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="pf-type">Tipo *</Label>
          <select
            id="pf-type"
            name="type"
            defaultValue={property?.type ?? 'residential'}
            disabled={!canEdit || isPending}
            className={selectCls}
          >
            <option value="residential">Residencial</option>
            <option value="commercial">Comercial</option>
            <option value="mixed">Misto</option>
          </select>
          {err('type') && <p className="text-xs text-destructive">{err('type')}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pf-area">Área (m²)</Label>
          <Input
            id="pf-area"
            name="area"
            type="number"
            step="0.01"
            min="0"
            defaultValue={property?.area ?? ''}
            disabled={!canEdit || isPending}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="pf-rentAmount">Valor Aluguel (R$)</Label>
          <Input
            id="pf-rentAmount"
            name="rentAmount"
            type="number"
            step="0.01"
            min="0"
            defaultValue={property?.rentAmount ?? ''}
            disabled={!canEdit || isPending}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pf-adminFeePct">Taxa Admin (%)</Label>
          <Input
            id="pf-adminFeePct"
            name="adminFeePct"
            type="number"
            step="0.1"
            min="0"
            max="100"
            defaultValue={property?.adminFeePct ?? '10'}
            disabled={!canEdit || isPending}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="pf-ownerId">Proprietário</Label>
        <select
          id="pf-ownerId"
          name="ownerId"
          defaultValue={property?.ownerId ?? ''}
          disabled={!canEdit || isPending}
          className={selectCls}
        >
          <option value="">Sem proprietário</option>
          {owners.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </div>

      {canEdit && (
        <div className="flex justify-end pt-2">
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Criar imóvel'}
          </Button>
        </div>
      )}
    </form>
  )
}
