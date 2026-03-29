import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export type LeaseStatus = 'active' | 'ended' | 'renewing' | 'overdue'

const STATUS_CONFIG: Record<LeaseStatus, { label: string; className: string }> = {
  active: {
    label: 'Vigente',
    className: 'border-[#1D9E75] bg-[#1D9E75]/10 text-[#1D9E75]',
  },
  ended: {
    label: 'Encerrado',
    className: 'border-gray-400 bg-gray-100 text-gray-500',
  },
  renewing: {
    label: 'Renovando',
    className: 'border-[#EF9F27] bg-[#EF9F27]/10 text-[#EF9F27]',
  },
  overdue: {
    label: 'Em Atraso',
    className: 'border-[#E24B4A] bg-[#E24B4A]/10 text-[#E24B4A]',
  },
}

type Props = {
  status: LeaseStatus
  className?: string
}

export function LeaseStatusBadge({ status, className }: Props) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.ended

  return (
    <Badge
      variant="outline"
      className={cn('shrink-0 whitespace-nowrap font-medium', config.className, className)}
    >
      {config.label}
    </Badge>
  )
}
