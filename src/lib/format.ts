import { differenceInMinutes, format, isSameDay, isToday, isYesterday, parseISO } from 'date-fns'

export function formatDayHeading(date: Date): string {
  if (isToday(date)) return 'Today'
  if (isYesterday(date)) return 'Yesterday'
  return format(date, date.getFullYear() === new Date().getFullYear() ? 'EEEE, MMM d' : 'EEEE, MMM d, yyyy')
}

export function formatDuration(start: Date, end: Date): string {
  const minutes = differenceInMinutes(end, start)
  if (minutes < 1) return '<1m'
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  const mins = minutes % 60
  return [days && `${days}d`, hours && `${hours}h`, mins && `${mins}m`].filter(Boolean).join(' ')
}

/** "3:45 PM" for point events, "3:45 – 5:00 PM (1h 15m)" for spans. */
export function formatEventTime(startIso: string, endIso: string | null): string {
  const start = parseISO(startIso)
  if (!endIso) return format(start, 'h:mm a')
  const end = parseISO(endIso)
  const range = isSameDay(start, end)
    ? `${format(start, 'h:mm a')} – ${format(end, 'h:mm a')}`
    : `${format(start, 'MMM d, h:mm a')} – ${format(end, 'MMM d, h:mm a')}`
  return `${range} · ${formatDuration(start, end)}`
}

export function formatEventDateTime(startIso: string, endIso: string | null): string {
  const start = parseISO(startIso)
  return `${format(start, 'EEE, MMM d, yyyy')} · ${formatEventTime(startIso, endIso)}`
}

/** Value for an <input type="datetime-local"> in the user's local time zone. */
export function toLocalInputValue(date: Date): string {
  return format(date, "yyyy-MM-dd'T'HH:mm")
}

export function fromLocalInputValue(value: string): Date {
  return new Date(value)
}
