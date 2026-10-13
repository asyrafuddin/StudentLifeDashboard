import { differenceInCalendarDays, differenceInMinutes, format } from 'date-fns'
import type { Exam } from '@/types/database'

/** Exam types offered as suggestions; students can still type their own. */
export const EXAM_TYPE_SUGGESTIONS = ['Midterm', 'Final', 'Quiz', 'Lab exam', 'Oral exam', 'Presentation', 'Test']

/** How far away an exam is, for color + wording. */
export type ExamUrgency = 'today' | 'this_week' | 'later' | 'past'

export interface ExamCountdown {
  urgency: ExamUrgency
  /** Short label for a countdown tile: "Today", "1 day", "12 days". */
  short: string
  /** Full sentence-style label: "In 3 hours", "Tomorrow at 9:00 AM", "In 5 days". */
  long: string
}

/**
 * Describes how long until an exam starts, using the browser's local time.
 * Days are counted by calendar date, so an exam tomorrow morning is
 * "Tomorrow" even if it's less than 24 hours away.
 */
export function getExamCountdown(startsAt: string, now: Date): ExamCountdown {
  const start = new Date(startsAt)
  const time = format(start, 'h:mm a')

  if (start < now) {
    return { urgency: 'past', short: 'Done', long: `Took place ${format(start, 'd MMM yyyy')}` }
  }

  const days = differenceInCalendarDays(start, now)
  if (days === 0) {
    const minutes = differenceInMinutes(start, now)
    const long =
      minutes < 60 ? `In ${Math.max(minutes, 1)} min` : `In ${Math.floor(minutes / 60)} h (${time})`
    return { urgency: 'today', short: 'Today', long }
  }
  if (days === 1) return { urgency: 'this_week', short: '1 day', long: `Tomorrow at ${time}` }
  return {
    urgency: days <= 7 ? 'this_week' : 'later',
    short: `${days} days`,
    long: `In ${days} days`,
  }
}

/** Upcoming exams soonest first; past exams most recent first. */
export function splitExams(exams: Exam[], now: Date): { upcoming: Exam[]; past: Exam[] } {
  const time = (e: Exam) => new Date(e.starts_at).getTime()
  const upcoming = exams.filter((e) => time(e) >= now.getTime()).sort((a, b) => time(a) - time(b))
  const past = exams.filter((e) => time(e) < now.getTime()).sort((a, b) => time(b) - time(a))
  return { upcoming, past }
}
