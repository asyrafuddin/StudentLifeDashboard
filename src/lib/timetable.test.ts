import { describe, expect, it } from 'vitest'
import { findClashes, getClashMap, getHourRange, layoutDay, minutesToTime, slotsOverlap, timeToMinutes } from '@/lib/timetable'
import type { ClassSession, DayOfWeek } from '@/types/database'

function session(id: string, day: DayOfWeek, start: string, end: string): ClassSession {
  return {
    id,
    user_id: 'u1',
    course_id: 'c1',
    day_of_week: day,
    start_time: `${start}:00`,
    end_time: `${end}:00`,
    location: null,
    instructor: null,
    created_at: '',
    updated_at: '',
  }
}

describe('time conversion', () => {
  it('converts between "HH:MM(:SS)" and minutes', () => {
    expect(timeToMinutes('09:30:00')).toBe(570)
    expect(timeToMinutes('09:30')).toBe(570)
    expect(minutesToTime(570)).toBe('09:30')
    expect(minutesToTime(5)).toBe('00:05')
  })
})

describe('slotsOverlap', () => {
  it('detects overlapping times on the same day', () => {
    expect(slotsOverlap(session('a', 1, '09:00', '10:30'), session('b', 1, '10:00', '11:00'))).toBe(true)
    expect(slotsOverlap(session('a', 1, '09:00', '12:00'), session('b', 1, '10:00', '11:00'))).toBe(true)
  })

  it('treats back-to-back classes as not overlapping', () => {
    expect(slotsOverlap(session('a', 1, '09:00', '10:00'), session('b', 1, '10:00', '11:00'))).toBe(false)
  })

  it('ignores the same times on different days', () => {
    expect(slotsOverlap(session('a', 1, '09:00', '10:00'), session('b', 2, '09:00', '10:00'))).toBe(false)
  })
})

describe('findClashes / getClashMap', () => {
  const sessions = [
    session('a', 1, '09:00', '10:30'),
    session('b', 1, '10:00', '11:00'),
    session('c', 1, '13:00', '14:00'),
  ]

  it('finds clashes for a new (unsaved) slot', () => {
    expect(findClashes({ day_of_week: 1, start_time: '10:15', end_time: '10:45' }, sessions).map((s) => s.id)).toEqual(['a', 'b'])
  })

  it('does not report a session clashing with itself when editing it', () => {
    expect(findClashes(sessions[0], sessions).map((s) => s.id)).toEqual(['b'])
  })

  it('maps only the sessions that clash', () => {
    const map = getClashMap(sessions)
    expect([...map.keys()]).toEqual(['a', 'b'])
    expect(map.get('a')?.map((s) => s.id)).toEqual(['b'])
  })
})

describe('layoutDay', () => {
  const place = (sessions: ClassSession[]) =>
    Object.fromEntries(layoutDay(sessions).map((p) => [p.session.id, [p.column, p.columnCount]]))

  it('gives non-overlapping sessions a full-width column', () => {
    expect(place([session('a', 1, '09:00', '10:00'), session('b', 1, '10:00', '11:00')])).toEqual({
      a: [0, 1],
      b: [0, 1],
    })
  })

  it('puts two overlapping sessions side by side', () => {
    expect(place([session('a', 1, '09:00', '10:30'), session('b', 1, '10:00', '11:00')])).toEqual({
      a: [0, 2],
      b: [1, 2],
    })
  })

  it('reuses a free column within a chain of overlaps', () => {
    // a overlaps b, b overlaps c, but a and c don't overlap: two columns are enough.
    expect(
      place([session('a', 1, '09:00', '10:00'), session('b', 1, '09:30', '11:00'), session('c', 1, '10:00', '11:30')]),
    ).toEqual({ a: [0, 2], b: [1, 2], c: [0, 2] })
  })

  it('handles three-way overlaps', () => {
    const result = place([
      session('a', 1, '09:00', '12:00'),
      session('b', 1, '09:30', '10:30'),
      session('c', 1, '10:00', '11:00'),
    ])
    expect(result).toEqual({ a: [0, 3], b: [1, 3], c: [2, 3] })
  })

  it('handles an empty day', () => {
    expect(layoutDay([])).toEqual([])
  })
})

describe('getHourRange', () => {
  it('defaults to 8:00-18:00', () => {
    expect(getHourRange([])).toEqual({ startHour: 8, endHour: 18 })
  })

  it('widens to fit early and late classes, rounding outward', () => {
    expect(getHourRange([session('a', 1, '07:30', '09:00'), session('b', 2, '18:00', '19:15')])).toEqual({
      startHour: 7,
      endHour: 20,
    })
  })
})
