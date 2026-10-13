import type { ClassSession, DayOfWeek } from '@/types/database'

/**
 * Timetable helpers. Times come from the database as "HH:MM:SS" (or "HH:MM"
 * from a form); everything here works in minutes since midnight.
 */

export const DAYS: Array<{ value: DayOfWeek; short: string; long: string }> = [
  { value: 1, short: 'Mon', long: 'Monday' },
  { value: 2, short: 'Tue', long: 'Tuesday' },
  { value: 3, short: 'Wed', long: 'Wednesday' },
  { value: 4, short: 'Thu', long: 'Thursday' },
  { value: 5, short: 'Fri', long: 'Friday' },
  { value: 6, short: 'Sat', long: 'Saturday' },
  { value: 7, short: 'Sun', long: 'Sunday' },
]

/** "09:30:00" or "09:30" -> 570 */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

/** 570 -> "09:30" (the format <input type="time"> uses) */
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** Anything with a day and a time range, so form values can be checked too. */
export interface TimeSlot {
  id?: string
  day_of_week: number
  start_time: string
  end_time: string
}

/**
 * True if two sessions are on the same day and their times overlap.
 * Back-to-back classes (one ends at 10:00, the next starts at 10:00) don't count.
 */
export function slotsOverlap(a: TimeSlot, b: TimeSlot): boolean {
  return (
    a.day_of_week === b.day_of_week &&
    timeToMinutes(a.start_time) < timeToMinutes(b.end_time) &&
    timeToMinutes(b.start_time) < timeToMinutes(a.end_time)
  )
}

/** The sessions that clash with `slot` (excluding itself, matched by id). */
export function findClashes<T extends TimeSlot>(slot: TimeSlot, sessions: T[]): T[] {
  return sessions.filter((s) => (slot.id === undefined || s.id !== slot.id) && slotsOverlap(slot, s))
}

/** For each session id, the other sessions it overlaps with (only ids that clash). */
export function getClashMap(sessions: ClassSession[]): Map<string, ClassSession[]> {
  const map = new Map<string, ClassSession[]>()
  for (const s of sessions) {
    const clashes = findClashes(s, sessions)
    if (clashes.length > 0) map.set(s.id, clashes)
  }
  return map
}

export interface PositionedSession {
  session: ClassSession
  /** Which side-by-side column this session sits in (0-based). */
  column: number
  /** How many columns its group of overlapping sessions needs. */
  columnCount: number
}

/**
 * Arranges one day's sessions so overlapping ones sit side by side instead of
 * on top of each other (like a calendar app):
 *  1. Sort by start time.
 *  2. Group sessions that overlap each other, directly or through a chain.
 *  3. Within a group, put each session in the first column that's free.
 */
export function layoutDay(sessions: ClassSession[]): PositionedSession[] {
  const sorted = [...sessions].sort(
    (a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time) || timeToMinutes(a.end_time) - timeToMinutes(b.end_time),
  )
  const result: PositionedSession[] = []

  let group: PositionedSession[] = []
  let groupEnd = -1
  // End time of the last session placed in each column of the current group.
  let columnEnds: number[] = []

  const finishGroup = () => {
    for (const item of group) item.columnCount = columnEnds.length
    result.push(...group)
    group = []
    columnEnds = []
  }

  for (const session of sorted) {
    const start = timeToMinutes(session.start_time)
    const end = timeToMinutes(session.end_time)
    if (start >= groupEnd) finishGroup() // no overlap with the current group

    let column = columnEnds.findIndex((columnEnd) => columnEnd <= start)
    if (column === -1) column = columnEnds.length
    columnEnds[column] = end
    group.push({ session, column, columnCount: 0 })
    groupEnd = Math.max(groupEnd, end)
  }
  finishGroup()
  return result
}

/**
 * Whole-hour range the grid should show: at least 8:00–18:00, widened to fit
 * any earlier or later classes.
 */
export function getHourRange(sessions: ClassSession[]): { startHour: number; endHour: number } {
  let startHour = 8
  let endHour = 18
  for (const s of sessions) {
    startHour = Math.min(startHour, Math.floor(timeToMinutes(s.start_time) / 60))
    endHour = Math.max(endHour, Math.ceil(timeToMinutes(s.end_time) / 60))
  }
  return { startHour, endHour }
}
