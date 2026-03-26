'use client'

import { useActionState } from 'react'
import { inviteUserAction, type InviteResult } from './actions'

const ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'financeiro', label: 'Financeiro' },
  { value: 'operacional', label: 'Operacional' },
  { value: 'visualizador', label: 'Visualizador' },
]

export function InviteForm() {
  const [state, action, pending] = useActionState<InviteResult | null, FormData>(
    inviteUserAction,
    null,
  )

  return (
    <form action={action} className="flex flex-col gap-3">
      <h2 className="font-semibold text-lg">Convidar usuário</h2>

      {state && !state.success && <p className="text-red-600 text-sm">{state.error}</p>}
      {state?.success && <p className="text-green-600 text-sm">Convite enviado com sucesso!</p>}

      <div className="flex gap-2">
        <input
          type="email"
          name="email"
          required
          placeholder="email@exemplo.com"
          className="border rounded px-3 py-2 text-sm flex-1"
        />
        <select name="role" className="border rounded px-3 py-2 text-sm">
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={pending}
          className="bg-purple-700 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
        >
          {pending ? 'Enviando…' : 'Convidar'}
        </button>
      </div>
    </form>
  )
}
