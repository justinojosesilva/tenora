import { Skeleton } from '@/components/ui/skeleton'

export function SidebarSkeleton() {
  return (
    <aside className="flex w-60 shrink-0 flex-col bg-sidebar">
      {/* Header */}
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-4 w-16 bg-sidebar-accent" />
          <Skeleton className="h-3 w-24 bg-sidebar-accent/60" />
        </div>
        <Skeleton className="h-8 w-8 rounded-md bg-sidebar-accent/60" />
      </div>

      {/* Nav items */}
      <div className="flex-1 px-2 py-4 space-y-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full rounded-md bg-sidebar-accent/40" />
        ))}
      </div>

      {/* Bottom */}
      <div className="border-t border-sidebar-border px-2 py-3">
        <Skeleton className="h-9 w-full rounded-md bg-sidebar-accent/40" />
      </div>

      {/* CTA */}
      <div className="px-2 pb-3">
        <Skeleton className="h-8 w-full rounded-md bg-sidebar-accent/60" />
      </div>

      {/* User */}
      <div className="flex items-center gap-3 border-t border-sidebar-border p-3">
        <Skeleton className="h-8 w-8 rounded-full bg-sidebar-accent/60" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3 w-24 bg-sidebar-accent/60" />
          <Skeleton className="h-3 w-32 bg-sidebar-accent/40" />
        </div>
      </div>
    </aside>
  )
}
