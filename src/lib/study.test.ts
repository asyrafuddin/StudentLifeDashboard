import { describe, expect, it } from 'vitest'
import {
  elapsedSeconds,
  findRunningSession,
  formatDuration,
  formatTimer,
  sessionsInPeriod,
  studyTimeByCourse,
  summarizeStudy,
} from '@/lib/study'
import type { StudySession } from '@/types/database'

// Wednesday 14 October 2026, 15:00 local time (week starts Monday 12 October).
const NOW = new Date(2026, 9, 14, 15, 0)

function session(id: string, started: Date, minutes: number | null, course_id: string | null = 'c1'): StudySession {
  return {
    id,
    user_id: 'u1',
    course_id,
    started_at: started.toISOString(),
    ended_at: minutes === null ? null : new Date(started.getTime() + minutes * 60_000).toISOString(),
    duration_seconds: minutes === null ? null : minutes * 60,
    notes: null,
    created_at: '',
  }
}

describe('timer formatting', () => {
  it('formats a running timer as h:mm:ss', () => {
    expect(formatTimer(3725)).toBe('1:02:05')
    expect(formatTimer(0)).toBe('0:00:00')
  })

  it('formats totals compactly', () => {
    expect(formatDuration(5400)).toBe('1h 30m')
    expect(formatDuration(3600)).toBe('1h')
    expect(formatDuration(600)).toBe('10m')
    expect(formatDuration(20)).toBe('<1m')
    expect(formatDuration(0)).toBe('0m')
  })

  it('counts elapsed whole seconds, never negative', () => {
    expect(elapsedSeconds(new Date(NOW.getTime() - 90_500).toISOString(), NOW)).toBe(90)
    expect(elapsedSeconds(new Date(NOW.getTime() + 5000).toISOString(), NOW)).toBe(0)
  })
})

describe('findRunningSession', () => {
  it('finds the most recently started unfinished session', () => {
    const running = findRunningSession([
      session('done', new Date(2026, 9, 14, 9), 30),
      session('old-running', new Date(2026, 9, 13, 9), null),
      session('new-running', new Date(2026, 9, 14, 14), null),
    ])
    expect(running?.id).toBe('new-running')
  })

  it('returns null when nothing is running', () => {
    expect(findRunningSession([session('done', NOW, 10)])).toBeNull()
  })
})

describe('summarizeStudy', () => {
  it('totals today and this week, ignoring running and older sessions', () => {
    const summary = summarizeStudy(
      [
        session('today-1', new Date(2026, 9, 14, 9), 30),
        session('today-2', new Date(2026, 9, 14, 13), 45),
        session('monday', new Date(2026, 9, 12, 20), 60),
        session('last-sunday', new Date(2026, 9, 11, 20), 120),
        session('running', new Date(2026, 9, 14, 14, 30), null),
      ],
      NOW,
    )
    expect(summary).toEqual({ todaySeconds: 75 * 60, weekSeconds: 135 * 60, weekSessionCount: 3 })
  })
})

describe('studyTimeByCourse', () => {
  it('groups by course (including unlinked sessions) and sorts largest first', () => {
    const totals = studyTimeByCourse([
      session('a', NOW, 30, 'c1'),
      session('b', NOW, 90, 'c2'),
      session('c', NOW, 20, null),
      session('d', NOW, 15, 'c1'),
      session('running', NOW, null, 'c1'),
    ])
    expect(totals).toEqual([
      { courseId: 'c2', seconds: 90 * 60 },
      { courseId: 'c1', seconds: 45 * 60 },
      { courseId: null, seconds: 20 * 60 },
    ])
  })
})

describe('sessionsInPeriod', () => {
  const sessions = [
    session('this-week', new Date(2026, 9, 13, 10), 30),
    session('two-weeks-ago', new Date(2026, 9, 1, 10), 30),
    session('two-months-ago', new Date(2026, 7, 10, 10), 30),
  ]
  const ids = (period: 'week' | '30d' | 'all') => sessionsInPeriod(sessions, period, NOW).map((s) => s.id)

  it('filters by period', () => {
    expect(ids('week')).toEqual(['this-week'])
    expect(ids('30d')).toEqual(['this-week', 'two-weeks-ago'])
    expect(ids('all')).toHaveLength(3)
  })
})
