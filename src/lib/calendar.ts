import { addDays, endOfMonth, endOfWeek, startOfMonth, startOfWeek } from 'date-fns'

/**
 * The days shown in a month calendar, as weeks (Monday to Sunday). Includes
 * the trailing/leading days from neighboring months needed to fill each week.
 */
export function getMonthGrid(month: Date): Date[][] {
  const first = startOfWeek(startOfMonth(month), { weekStartsOn: 1 })
  const last = endOfWeek(endOfMonth(month), { weekStartsOn: 1 })

  const weeks: Date[][] = []
  for (let day = first; day <= last; day = addDays(day, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(day, i)))
  }
  return weeks
}
