import { describe, expect, it } from 'vitest'
import { getExamCountdown, splitExams } from '@/lib/exams'
import type { Exam } from '@/types/database'

// Tuesday 13 October 2026, 12:00 local time.
const NOW = new Date(2026, 9, 13, 12, 0)
const at = (...args: [number, number, number, number, number]) => new Date(...args).toISOString()

describe('getExamCountdown', () => {
  it('counts minutes and hours for an exam later today', () => {
    expect(getExamCountdown(at(2026, 9, 13, 12, 40), NOW)).toMatchObject({ urgency: 'today', short: 'Today', long: 'In 40 min' })
    expect(getExamCountdown(at(2026, 9, 13, 15, 0), NOW)).toMatchObject({ urgency: 'today', long: 'In 3 h (3:00 PM)' })
  })

  it('says "Tomorrow" by calendar day, even if under 24 hours away', () => {
    expect(getExamCountdown(at(2026, 9, 14, 9, 0), NOW)).toMatchObject({
      urgency: 'this_week',
      short: '1 day',
      long: 'Tomorrow at 9:00 AM',
    })
  })

  it('separates this week from later', () => {
    expect(getExamCountdown(at(2026, 9, 20, 9, 0), NOW)).toMatchObject({ urgency: 'this_week', short: '7 days' })
    expect(getExamCountdown(at(2026, 9, 21, 9, 0), NOW)).toMatchObject({ urgency: 'later', long: 'In 8 days' })
  })

  it('marks exams that already started as past', () => {
    expect(getExamCountdown(at(2026, 9, 13, 11, 0), NOW).urgency).toBe('past')
  })
})

describe('splitExams', () => {
  const exam = (id: string, startsAt: string) => ({ id, starts_at: startsAt }) as Exam

  it('orders upcoming soonest first and past most recent first', () => {
    const { upcoming, past } = splitExams(
      [
        exam('next-month', at(2026, 10, 10, 9, 0)),
        exam('last-month', at(2026, 8, 10, 9, 0)),
        exam('tomorrow', at(2026, 9, 14, 9, 0)),
        exam('yesterday', at(2026, 9, 12, 9, 0)),
      ],
      NOW,
    )
    expect(upcoming.map((e) => e.id)).toEqual(['tomorrow', 'next-month'])
    expect(past.map((e) => e.id)).toEqual(['yesterday', 'last-month'])
  })
})
