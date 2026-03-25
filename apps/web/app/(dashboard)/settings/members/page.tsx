import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { InviteForm } from './InviteForm'
import { PendingInvitations } from './PendingInvitations'

export const metadata = { title: 'Membros — Tenora' }

export default async function MembersPage() {
  const { userId, orgId, orgRole } = await auth()

  if (!userId || !orgId) redirect('/sign-in')

  const isAdmin = orgRole === 'org:admin'

  return (
    <main className="max-w-2xl mx-auto py-10 px-4 flex flex-col gap-8">
      <h1 className="text-2xl font-bold">Membros</h1>

      {isAdmin && (
        <section className="border rounded-lg p-6 flex flex-col gap-4">
          <InviteForm />
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold text-lg">Convites pendentes</h2>
        {isAdmin ? (
          <PendingInvitations />
        ) : (
          <p className="text-sm text-gray-500">Apenas admins podem ver convites pendentes.</p>
        )}
      </section>
    </main>
  )
}
