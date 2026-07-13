import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | null | undefined, fmt = 'dd MMM yyyy') {
  if (!date) return '—'
  return format(new Date(date), fmt)
}

export function formatDateTime(date: string | null | undefined) {
  return formatDate(date, 'dd MMM yyyy, HH:mm')
}

export function getEntryName(entry: {
  team?: { name: string } | null
  player?: { user: { displayName: string } } | null
  partner?: { user: { displayName: string } } | null
} | null | undefined): string {
  if (!entry) return 'TBD'
  if (entry.team) return entry.team.name
  if (entry.player) {
    const name = entry.player.user.displayName
    return entry.partner ? `${name} / ${entry.partner.user.displayName}` : name
  }
  return 'TBD'
}

export const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  REGISTRATION_OPEN: 'bg-green-100 text-green-700',
  REGISTRATION_CLOSED: 'bg-yellow-100 text-yellow-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-purple-100 text-purple-700',
  CANCELLED: 'bg-red-100 text-red-700',
  UPCOMING: 'bg-gray-100 text-gray-600',
  LIVE: 'bg-red-100 text-red-700 animate-pulse',
  WALKOVER: 'bg-orange-100 text-orange-700',
}
