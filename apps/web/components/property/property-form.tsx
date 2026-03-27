'use client'

import { useEffect, useActionState, useState } from 'react'
import { usePostHog } from 'posthog-js/react'
import { Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { OwnerCombobox } from './owner-combobox'
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

type CepStatus = 'idle' | 'loading' | 'error' | 'not-found'

const selectCls =
  'w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50'

function maskCep(value: string): string {
  const digits = value.replace(/\D/g, '').substring(0, 8)
  if (digits.length > 5) return `${digits.substring(0, 5)}-${digits.substring(5)}`
  return digits
}

export function PropertyForm({ property, owners, canEdit, onSuccess }: Props) {
  const isEdit = !!property?.id
  const action = isEdit ? updatePropertyAction : createPropertyAction
  const ph = usePostHog()

  const [state, formAction, isPending] = useActionState<PropertyFormState, FormData>(action, null)

  // Controlled location fields (needed for ViaCEP autofill)
  const [zipCode, setZipCode] = useState(property?.zipCode ?? '')
  const [address, setAddress] = useState(property?.address ?? '')
  const [city, setCity] = useState(property?.city ?? '')
  const [uf, setUf] = useState(property?.state ?? '')
  const [cepStatus, setCepStatus] = useState<CepStatus>('idle')

  useEffect(() => {
    if (state?.success) {
      if (!isEdit) {
        ph?.capture('property_created', { type: property?.type })
      }
      onSuccess?.()
    }
  }, [state?.success]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleCepChange = (raw: string) => {
    const masked = maskCep(raw)
    setZipCode(masked)
    const digits = masked.replace(/\D/g, '')
    if (digits.length === 8) {
      fetchCep(digits)
    } else {
      setCepStatus('idle')
    }
  }

  const fetchCep = async (digits: string) => {
    setCepStatus('loading')
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
      if (!res.ok) throw new Error('Falha na requisição')
      const data = await res.json()
      if (data.erro) {
        setCepStatus('not-found')
        return
      }
      if (data.logradouro) setAddress(data.logradouro)
      if (data.localidade) setCity(data.localidade)
      if (data.uf) setUf(data.uf)
      setCepStatus('idle')
    } catch {
      setCepStatus('error')
    }
  }

  const err = (field: string) => state?.fieldErrors?.[field]?.[0]

  const fieldDisabled = !canEdit || isPending

  return (
    <form action={formAction} className="space-y-4 overflow-y-auto p-5">
      {isEdit && <input type="hidden" name="id" value={property.id} />}

      {state?.error && !state.fieldErrors && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      {/* CEP — first so autofill flows down */}
      <div className="space-y-1.5">
        <Label htmlFor="pf-zipCode">CEP</Label>
        <div className="relative">
          <Input
            id="pf-zipCode"
            name="zipCode"
            value={zipCode}
            onChange={(e) => handleCepChange(e.target.value)}
            disabled={fieldDisabled}
            placeholder="00000-000"
            inputMode="numeric"
            className={
              cepStatus === 'not-found' || cepStatus === 'error' ? 'border-destructive' : ''
            }
          />
          {cepStatus === 'loading' && (
            <Loader2 className="absolute right-2.5 top-2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
        {cepStatus === 'not-found' && (
          <p className="text-xs text-destructive">CEP não encontrado</p>
        )}
        {cepStatus === 'error' && (
          <p className="text-xs text-destructive">
            Erro ao consultar o CEP. Verifique sua conexão.
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="pf-address">
          Endereço *
          {cepStatus === 'loading' && (
            <span className="ml-1 text-xs text-muted-foreground">preenchendo...</span>
          )}
        </Label>
        <Input
          id="pf-address"
          name="address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          disabled={fieldDisabled}
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
            value={city}
            onChange={(e) => setCity(e.target.value)}
            disabled={fieldDisabled}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pf-state">Estado</Label>
          <Input
            id="pf-state"
            name="state"
            value={uf}
            onChange={(e) => setUf(e.target.value)}
            disabled={fieldDisabled}
            maxLength={2}
            placeholder="SP"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="pf-type">Tipo *</Label>
          <select
            id="pf-type"
            name="type"
            defaultValue={property?.type ?? 'residential'}
            disabled={fieldDisabled}
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
            disabled={fieldDisabled}
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
            disabled={fieldDisabled}
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
            disabled={fieldDisabled}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Proprietário</Label>
        <OwnerCombobox
          name="ownerId"
          initialValue={property?.ownerId ?? ''}
          initialOwners={owners}
          disabled={fieldDisabled}
        />
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
