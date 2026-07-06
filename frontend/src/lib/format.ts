import { format, isToday, isYesterday } from 'date-fns'

export function formatMessageTime(iso: string) {
  const d = new Date(iso)
  return format(d, 'h:mm a')
}

export function formatDayLabel(iso: string) {
  const d = new Date(iso)
  if (isToday(d)) return 'Today'
  if (isYesterday(d)) return 'Yesterday'
  return format(d, 'EEEE, MMM d')
}
