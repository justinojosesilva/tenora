import { Skeleton } from '@/components/ui/skeleton'

export function LeaseTableSkeleton() {
  return (
    <>
      {/* Desktop table skeleton */}
      <div className="hidden overflow-hidden rounded-xl border md:block">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              {['Imóvel', 'Inquilino', 'Valor', 'Dia Vencto.', 'Vigência', 'Status'].map((h) => (
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
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="mt-1 h-3 w-24" />
                </td>
                <td className="px-4 py-3">
                  <Skeleton className="h-4 w-32" />
                </td>
                <td className="px-4 py-3 text-right">
                  <Skeleton className="ml-auto h-4 w-24" />
                </td>
                <td className="px-4 py-3 text-center">
                  <Skeleton className="mx-auto h-4 w-10" />
                </td>
                <td className="hidden px-4 py-3 lg:table-cell">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="mt-1.5 h-1.5 w-full" />
                </td>
                <td className="px-4 py-3">
                  <Skeleton className="h-5 w-20 rounded-full" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card skeletons */}
      <div className="space-y-3 md:hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border p-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="mt-3 h-4 w-48" />
            <Skeleton className="mt-1 h-3 w-32" />
            <Skeleton className="mt-3 h-1.5 w-full" />
          </div>
        ))}
      </div>
    </>
  )
}
