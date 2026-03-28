'use client'

import { useEffect, useActionState, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  createOwnerAction,
  updateOwnerAction,
  type OwnerFormState,
} from '@/app/(dashboard)/proprietarios/actions'

export type FormOwnerData = {
  id: string
  name: string
  cpfCnpj: string
  email: string | null
  phone: string | null
}

type Props = {
  owner?: FormOwnerData
  canEdit: boolean
  onSuccess?: () => void
}

function maskCpfCnpj(value: string): string {
  const digits = value.replace(/\D/g, '').substring(0, 14)
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
  }
  return digits
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
}

function formatDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }
  if (digits.length === 14) {
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  }
  return raw
}

export function OwnerForm({ owner, canEdit, onSuccess }: Props) {
  const isEdit = !!owner?.id
  const action = isEdit ? updateOwnerAction : createOwnerAction

  const [state, formAction, isPending] = useActionState<OwnerFormState, FormData>(action, null)
  const [cpfCnpjDisplay, setCpfCnpjDisplay] = useState(
    owner?.cpfCnpj ? formatDisplay(owner.cpfCnpj) : '',
  )

  useEffect(() => {
    if (state?.success) onSuccess?.()
  }, [state?.success]) // eslint-disable-line react-hooks/exhaustive-deps

  const err = (field: string) => state?.fieldErrors?.[field]?.[0]

  const docType = cpfCnpjDisplay.replace(/\D/g, '').length <= 11 ? 'CPF' : 'CNPJ'

  return (
    <form action={formAction} className="space-y-4 overflow-y-auto p-5">
      {isEdit && <input type="hidden" name="id" value={owner.id} />}
      {/* Send raw digits to server action */}
      <input type="hidden" name="cpfCnpj" value={cpfCnpjDisplay} />

      {state?.error && !state.fieldErrors && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="of-name">Nome completo *</Label>
        <Input
          id="of-name"
          name="name"
          defaultValue={owner?.name ?? ''}
          disabled={!canEdit || isPending}
          placeholder="João da Silva"
        />
        {err('name') && <p className="text-xs text-destructive">{err('name')}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="of-cpfCnpj">
          CPF / CNPJ *{' '}
          <span className="text-xs text-muted-foreground">
            ({docType} — {cpfCnpjDisplay.replace(/\D/g, '').length}/
            {docType === 'CPF' ? '11' : '14'})
          </span>
        </Label>
        <Input
          id="of-cpfCnpj"
          value={cpfCnpjDisplay}
          onChange={(e) => setCpfCnpjDisplay(maskCpfCnpj(e.target.value))}
          disabled={!canEdit || isPending}
          placeholder="000.000.000-00"
          inputMode="numeric"
        />
        {err('cpfCnpj') && <p className="text-xs text-destructive">{err('cpfCnpj')}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="of-email">E-mail</Label>
        <Input
          id="of-email"
          name="email"
          type="email"
          defaultValue={owner?.email ?? ''}
          disabled={!canEdit || isPending}
          placeholder="joao@email.com"
        />
        {err('email') && <p className="text-xs text-destructive">{err('email')}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="of-phone">Telefone</Label>
        <Input
          id="of-phone"
          name="phone"
          type="tel"
          defaultValue={owner?.phone ?? ''}
          disabled={!canEdit || isPending}
          placeholder="(11) 99999-9999"
        />
      </div>

      {canEdit && (
        <div className="flex justify-end pt-2">
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Cadastrar proprietário'}
          </Button>
        </div>
      )}
    </form>
  )
}
