import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export type ChargeStatus = 'pending' | 'paid' | 'overdue' | 'cancelled'

const STATUS_CONFIG: Record<ChargeStatus, { label: string; className: string }> = {
  pending: {
    label: 'Em Aberto',
    className: 'border-blue-500 bg-blue-50 text-blue-700',
  },
  paid: {
    label: 'Pago',
    className: 'border-[#1D9E75] bg-[#1D9E75]/10 text-[#1D9E75]',
  },
  overdue: {
    label: 'Em Atraso',
    className: 'border-[#E24B4A] bg-[#E24B4A]/10 text-[#E24B4A]',
  },
  cancelled: {
    label: 'Cancelado',
    className: 'border-gray-400 bg-gray-100 text-gray-500',
  },
}

type Props = {
  status: ChargeStatus
  className?: string
}

export function ChargesStatusBadge({ status, className }: Props) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.cancelled

  return (
    <Badge
      variant="outline"
      className={cn('shrink-0 whitespace-nowrap font-medium', config.className, className)}
    >
      {config.label}
    </Badge>
  )
}
