import { cn, STATUS_DOT, STATUS_LABEL, STATUS_TEXT } from '../../lib/utils'

interface Props {
  status: string
  className?: string
}

export default function StatusPill({ status, className }: Props) {
  const dot   = STATUS_DOT[status]   ?? 'bg-gray-400'
  const label = STATUS_LABEL[status] ?? status.replace(/_/g, ' ')
  const text  = STATUS_TEXT[status]  ?? 'text-gray-400'
  const isLive = status === 'IN_PROGRESS' || status === 'LIVE'

  return (
    <span
      className={cn(
        'glass inline-flex items-center gap-1.5 rounded-full px-2.5 py-1',
        'font-mono text-[10px] tracking-[0.14em] uppercase',
        text,
        className
      )}
    >
      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', dot, isLive && 'animate-pulse')} />
      {label}
    </span>
  )
}
