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

// Legacy — kept for untouched internal components (EliminationBracket, ScoreModal, etc.)
export const STATUS_COLORS: Record<string, string> = {
  DRAFT:               'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300',
  REGISTRATION_OPEN:   'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300',
  REGISTRATION_CLOSED: 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300',
  IN_PROGRESS:         'bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-300',
  COMPLETED:           'bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400',
  CANCELLED:           'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300',
  UPCOMING:            'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300',
  LIVE:                'bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-300',
  WALKOVER:            'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300',
}

// New-design dot indicator
export const STATUS_DOT: Record<string, string> = {
  DRAFT:               'bg-gray-400',
  REGISTRATION_OPEN:   'bg-violet-500',
  REGISTRATION_CLOSED: 'bg-gray-400',
  IN_PROGRESS:         'bg-pink-500',
  COMPLETED:           'bg-gray-400',
  CANCELLED:           'bg-red-500',
  WALKOVER:            'bg-orange-400',
  LIVE:                'bg-pink-500',
  UPCOMING:            'bg-gray-400',
}

// Short human labels
export const STATUS_LABEL: Record<string, string> = {
  DRAFT:               'Draft',
  REGISTRATION_OPEN:   'Open',
  REGISTRATION_CLOSED: 'Closed',
  IN_PROGRESS:         'Live',
  COMPLETED:           'Done',
  CANCELLED:           'Cancelled',
  WALKOVER:            'Walkover',
  LIVE:                'Live',
  UPCOMING:            'Upcoming',
}

// Text colour for dot+label combos
export const STATUS_TEXT: Record<string, string> = {
  DRAFT:               'text-gray-400',
  REGISTRATION_OPEN:   'text-violet-500',
  REGISTRATION_CLOSED: 'text-gray-400',
  IN_PROGRESS:         'text-pink-500',
  COMPLETED:           'text-gray-400',
  CANCELLED:           'text-red-500',
  WALKOVER:            'text-orange-500',
  LIVE:                'text-pink-500',
  UPCOMING:            'text-gray-400',
}
