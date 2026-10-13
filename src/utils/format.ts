import { format, parse } from 'date-fns'
import type { AssignmentPriority, AssignmentStatus } from '@/types/database'

/** "14:30:00" -> "2:30 PM" (uses the browser's locale conventions via date-fns). */
export function formatTimeOfDay(time: string): string {
  return format(parse(time, 'HH:mm:ss', new Date()), 'h:mm a')
}

/** 135 -> "2h 15m", 45 -> "45m", 0 -> "0m". */
export function formatMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = Math.round(totalMinutes % 60)
  if (hours === 0) return `${minutes}m`
  if (minutes === 0) return `${hours}h`
  return `${hours}h ${minutes}m`
}

export const PRIORITY_LABELS: Record<AssignmentPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
}

export const STATUS_LABELS: Record<AssignmentStatus, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  completed: 'Completed',
}

/** Builds a quick id -> record lookup, e.g. to find a course by course_id. */
export function indexById<T extends { id: string }>(rows: T[]): Map<string, T> {
  return new Map(rows.map((row) => [row.id, row]))
}
