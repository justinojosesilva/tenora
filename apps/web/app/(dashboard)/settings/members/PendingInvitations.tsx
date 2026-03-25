'use client'

import { useOrganization } from '@clerk/nextjs'

export function PendingInvitations() {
  const { invitations, isLoaded } = useOrganization({
    invitations: { status: ['pending'] },
  })

  if (!isLoaded) return <p className="text-sm text-gray-400">Carregando convites…</p>

  const list = invitations?.data ?? []

  if (list.length === 0) {
    return <p className="text-sm text-gray-500">Nenhum convite pendente.</p>
  }

  return (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="border-b text-left text-gray-500">
          <th className="py-2 pr-4">Email</th>
          <th className="py-2 pr-4">Role</th>
          <th className="py-2 pr-4">Enviado em</th>
          <th className="py-2" />
        </tr>
      </thead>
      <tbody>
        {list.map((inv) => {
          const meta = inv.publicMetadata as Record<string, string> | null
          const role = meta?.role ?? 'visualizador'
          return (
            <tr key={inv.id} className="border-b last:border-0">
              <td className="py-2 pr-4">{inv.emailAddress}</td>
              <td className="py-2 pr-4 capitalize">{role}</td>
              <td className="py-2 pr-4">{new Date(inv.createdAt).toLocaleDateString('pt-BR')}</td>
              <td className="py-2 text-right">
                <button
                  onClick={async () => {
                    await inv.revoke()
                    if (invitations?.revalidate) await invitations.revalidate()
                  }}
                  className="text-red-500 hover:underline text-xs"
                >
                  Cancelar
                </button>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
