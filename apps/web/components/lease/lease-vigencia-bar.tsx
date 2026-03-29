import { cn } from '@/lib/utils'
import type { LeaseStatus } from './lease-status-badge'

type Props = {
  startDate: string
  endDate: string
  status?: LeaseStatus
  className?: string
}

function formatShortDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

export function LeaseVigenciaBar({ startDate, endDate, status, className }: Props) {
  const start = new Date(startDate).getTime()
  const end = new Date(endDate).getTime()
  const now = Date.now()
  const totalDuration = end - start
  const elapsed = now - start
  const pct =
    totalDuration > 0 ? Math.min(100, Math.max(0, Math.round((elapsed / totalDuration) * 100))) : 0

  const barColor =
    status === 'overdue' || pct >= 95
      ? 'bg-[#E24B4A]'
      : status === 'renewing'
        ? 'bg-[#EF9F27]'
        : 'bg-[#1D9E75]'

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{formatShortDate(startDate)}</span>
        <span className="font-medium">{pct}%</span>
        <span>{formatShortDate(endDate)}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full transition-all', barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
