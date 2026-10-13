import { addMonths, format, isSameDay, isSameMonth, isToday, subMonths } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { AssignmentList } from '@/components/assignments/AssignmentList'
import { Button } from '@/components/ui/button'
import type { AssignmentEditor } from '@/hooks/useAssignmentEditor'
import { assignmentsDueOn } from '@/lib/assignments'
import { getMonthGrid } from '@/lib/calendar'
import { cn } from '@/lib/utils'
import type { Assignment, Course } from '@/types/database'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MAX_TITLES_PER_DAY = 3

interface AssignmentCalendarProps {
  assignments: Assignment[]
  coursesById: Map<string, Course>
  editor: AssignmentEditor
  now: Date
}

/**
 * Month view of assignments by due date. Wide screens show titles in each day;
 * phones show colored dots. Selecting a day lists its assignments below.
 */
export function AssignmentCalendar({ assignments, coursesById, editor, now }: AssignmentCalendarProps) {
  const [month, setMonth] = useState(now)
  const [selectedDay, setSelectedDay] = useState(now)
  const weeks = getMonthGrid(month)
  const selectedAssignments = assignmentsDueOn(assignments, selectedDay)

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-card ring-1 ring-foreground/10">
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <h2 className="font-medium" aria-live="polite">
            {format(month, 'MMMM yyyy')}
          </h2>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => { setMonth(now); setSelectedDay(now) }}>
              Today
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label="Previous month" onClick={() => setMonth((m) => subMonths(m, 1))}>
              <ChevronLeft />
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label="Next month" onClick={() => setMonth((m) => addMonths(m, 1))}>
              <ChevronRight />
            </Button>
          </div>
        </div>

        <div role="grid" aria-label={`Assignments in ${format(month, 'MMMM yyyy')}`}>
          <div role="row" className="grid grid-cols-7 border-b text-center text-xs text-muted-foreground">
            {WEEKDAYS.map((d) => (
              <div key={d} role="columnheader" className="py-2">
                {d}
              </div>
            ))}
          </div>

          {weeks.map((week) => (
            <div key={week[0].toISOString()} role="row" className="grid grid-cols-7 border-b last:border-b-0">
              {week.map((day) => {
                const dayItems = assignmentsDueOn(assignments, day)
                const selected = isSameDay(day, selectedDay)
                const inMonth = isSameMonth(day, month)
                return (
                  <div
                    key={day.toISOString()}
                    role="gridcell"
                    aria-selected={selected}
                    className={cn('min-h-16 border-r p-1 last:border-r-0 sm:min-h-24', !inMonth && 'bg-muted/40')}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedDay(day)}
                      aria-label={`${format(day, 'EEEE d MMMM')}: ${dayItems.length} due`}
                      className={cn(
                        'flex size-7 items-center justify-center rounded-full text-xs tabular-nums',
                        'hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
                        !inMonth && 'text-muted-foreground',
                        isToday(day) && 'font-semibold text-primary',
                        selected && 'bg-primary text-primary-foreground hover:bg-primary',
                      )}
                    >
                      {format(day, 'd')}
                    </button>

                    {/* Phones: one dot per assignment (max 4). */}
                    <div className="mt-1 flex flex-wrap gap-0.5 px-1 sm:hidden" aria-hidden>
                      {dayItems.slice(0, 4).map((a) => (
                        <span
                          key={a.id}
                          className={cn('size-1.5 rounded-full', a.status === 'completed' && 'opacity-40')}
                          style={{ backgroundColor: coursesById.get(a.course_id)?.color }}
                        />
                      ))}
                    </div>

                    {/* Wider screens: titles. */}
                    <ul className="mt-1 hidden space-y-0.5 sm:block">
                      {dayItems.slice(0, MAX_TITLES_PER_DAY).map((a) => (
                        <li key={a.id}>
                          <button
                            type="button"
                            onClick={() => editor.openEdit(a)}
                            className={cn(
                              'w-full truncate rounded border-l-2 bg-muted/60 px-1 py-0.5 text-left text-[11px] leading-tight hover:bg-muted',
                              a.status === 'completed' && 'text-muted-foreground line-through',
                            )}
                            style={{ borderLeftColor: coursesById.get(a.course_id)?.color }}
                            title={a.title}
                          >
                            {a.title}
                          </button>
                        </li>
                      ))}
                      {dayItems.length > MAX_TITLES_PER_DAY && (
                        <li>
                          <button
                            type="button"
                            onClick={() => setSelectedDay(day)}
                            className="px-1 text-[11px] text-muted-foreground hover:underline"
                          >
                            +{dayItems.length - MAX_TITLES_PER_DAY} more
                          </button>
                        </li>
                      )}
                    </ul>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      <section aria-label={`Due on ${format(selectedDay, 'EEEE d MMMM')}`}>
        <h3 className="mb-2 text-sm font-medium">Due {format(selectedDay, 'EEEE, d MMMM')}</h3>
        {selectedAssignments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing due on this day (with the current filters).</p>
        ) : (
          <AssignmentList assignments={selectedAssignments} coursesById={coursesById} editor={editor} now={now} />
        )}
      </section>
    </div>
  )
}
