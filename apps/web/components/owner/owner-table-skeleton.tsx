import { Skeleton } from '@/components/ui/skeleton'

export function OwnerTableSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/40">
          <tr>
            {['Nome', 'CPF/CNPJ', 'E-mail', 'Imóveis', 'Saldo'].map((h) => (
              <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {Array.from({ length: 5 }).map((_, i) => (
            <tr key={i}>
              <td className="px-4 py-3">
                <Skeleton className="h-4 w-36" />
              </td>
              <td className="px-4 py-3">
                <Skeleton className="h-4 w-28" />
              </td>
              <td className="hidden px-4 py-3 md:table-cell">
                <Skeleton className="h-4 w-40" />
              </td>
              <td className="px-4 py-3 text-center">
                <Skeleton className="mx-auto h-5 w-8 rounded-full" />
              </td>
              <td className="px-4 py-3 text-right">
                <Skeleton className="ml-auto h-4 w-20" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
