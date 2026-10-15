import { isSameDay, startOfWeek, subDays } from 'date-fns'
import type { StudySession } from '@/types/database'

/**
 * Study-time calculations. A session is "finished" once it has a recorded
 * duration; a running timer has started_at but no ended_at/duration yet.
 */

/** The database limit for one session (24 hours). */
export const MAX_SESSION_SECONDS = 24 * 60 * 60

export function isRunning(session: StudySession): boolean {
  return session.ended_at === null
}

/** The timer that's currently running, if any (the most recently started). */
export function findRunningSession(sessions: StudySession[]): StudySession | null {
  return (
    sessions
      .filter(isRunning)
      .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())[0] ?? null
  )
}

/** Whole seconds between start and `now` (never negative). */
export function elapsedSeconds(startedAt: string, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - new Date(startedAt).getTime()) / 1000))
}

/** 3725 -> "1:02:05", 65 -> "0:01:05". For a running timer display. */
export function formatTimer(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** 5400 -> "1h 30m", 600 -> "10m", 20 -> "<1m". For totals and lists. */
export function formatDuration(seconds: number): string {
  if (seconds > 0 && seconds < 60) return '<1m'
  const totalMinutes = Math.round(seconds / 60)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

const finished = (sessions: StudySession[]) => sessions.filter((s) => s.duration_seconds !== null)
const total = (sessions: StudySession[]) => sessions.reduce((sum, s) => sum + (s.duration_seconds ?? 0), 0)

export interface StudySummary {
  todaySeconds: number
  weekSeconds: number
  /** Finished sessions this week. */
  weekSessionCount: number
}

/** Totals for today and this week (Monday to now), by the day each session started. */
export function summarizeStudy(sessions: StudySession[], now: Date): StudySummary {
  const done = finished(sessions)
  const weekStart = startOfWeek(now, { weekStartsOn: 1 })
  const thisWeek = done.filter((s) => {
    const started = new Date(s.started_at)
    return started >= weekStart && started <= now
  })
  return {
    todaySeconds: total(done.filter((s) => isSameDay(new Date(s.started_at), now))),
    weekSeconds: total(thisWeek),
    weekSessionCount: thisWeek.length,
  }
}

export const STUDY_PERIODS = {
  week: 'This week',
  '30d': 'Last 30 days',
  all: 'All time',
} as const
export type StudyPeriod = keyof typeof STUDY_PERIODS

/** Finished sessions that started within the period. */
export function sessionsInPeriod(sessions: StudySession[], period: StudyPeriod, now: Date): StudySession[] {
  const done = finished(sessions)
  if (period === 'all') return done
  const from = period === 'week' ? startOfWeek(now, { weekStartsOn: 1 }) : subDays(now, 30)
  return done.filter((s) => new Date(s.started_at) >= from)
}

export interface CourseStudyTotal {
  /** null = sessions not linked to a course. */
  courseId: string | null
  seconds: number
}

/** Study time per course, largest first. */
export function studyTimeByCourse(sessions: StudySession[]): CourseStudyTotal[] {
  const byCourse = new Map<string | null, number>()
  for (const s of finished(sessions)) {
    byCourse.set(s.course_id, (byCourse.get(s.course_id) ?? 0) + (s.duration_seconds ?? 0))
  }
  return [...byCourse.entries()]
    .map(([courseId, seconds]) => ({ courseId, seconds }))
    .sort((a, b) => b.seconds - a.seconds)
}
