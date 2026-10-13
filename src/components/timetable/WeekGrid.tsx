import { getISODay } from 'date-fns'
import { AlertTriangle } from 'lucide-react'
import type { MouseEvent } from 'react'
import type { ClassSessionEditor } from '@/hooks/useClassSessionEditor'
import { DAYS, getHourRange, layoutDay, minutesToTime, timeToMinutes } from '@/lib/timetable'
import { cn } from '@/lib/utils'
import type { ClassSession, Course, DayOfWeek } from '@/types/database'
import { formatTimeOfDay } from '@/utils/format'

/** Height of one hour in pixels. */
const HOUR_PX = 56

interface WeekGridProps {
  sessions: ClassSession[]
  coursesById: Map<string, Course>
  clashMap: Map<string, ClassSession[]>
  editor: ClassSessionEditor
  now: Date
}

/**
 * Monday–Sunday grid with a time axis. Classes are positioned by their start
 * and end times; overlapping classes share the width side by side.
 * Clicking an empty spot opens "Add class" pre-filled with that day and time.
 */
export function WeekGrid({ sessions, coursesById, clashMap, editor, now }: WeekGridProps) {
  const { startHour, endHour } = getHourRange(sessions)
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i)
  const height = hours.length * HOUR_PX
  const today = getISODay(now)
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const showNowLine = nowMinutes >= startHour * 60 && nowMinutes <= endHour * 60

  /** Pixel offset from the top of the grid for a time. */
  const offset = (minutes: number) => ((minutes - startHour * 60) / 60) * HOUR_PX

  const handleEmptyClick = (day: DayOfWeek, e: MouseEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return // a class block was clicked instead
    const y = e.clientY - e.currentTarget.getBoundingClientRect().top
    // Round down to the half hour.
    const minutes = startHour * 60 + Math.floor((y / HOUR_PX) * 2) * 30
    editor.openCreate({ dayOfWeek: day, startTime: minutesToTime(minutes) })
  }

  return (
    <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      {/* Day headers */}
      <div className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))] border-b">
        <div />
        {DAYS.map((d) => (
          <div
            key={d.value}
            className={cn('py-2 text-center text-xs font-medium text-muted-foreground', d.value === today && 'text-primary')}
          >
            {d.short}
            {d.value === today && <span className="sr-only"> (today)</span>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))]">
        {/* Time axis */}
        <div className="relative" style={{ height }} aria-hidden>
          {hours.map((h) => (
            <div key={h} className="absolute right-2 -translate-y-1/2 text-[11px] text-muted-foreground" style={{ top: offset(h * 60) }}>
              {/* Short labels ("9 AM") fit the narrow axis column. */}
              {h === startHour ? '' : `${h % 12 || 12} ${h < 12 ? 'AM' : 'PM'}`}
            </div>
          ))}
        </div>

        {DAYS.map((d) => (
          <div
            key={d.value}
            className={cn('relative cursor-copy border-l', d.value === today && 'bg-primary/[0.03]')}
            style={{
              height,
              // Faint hour lines.
              backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${HOUR_PX - 1}px, var(--border) ${HOUR_PX - 1}px, var(--border) ${HOUR_PX}px)`,
            }}
            onClick={(e) => handleEmptyClick(d.value, e)}
            title={`Click to add a class on ${d.long}`}
          >
            {layoutDay(sessions.filter((s) => s.day_of_week === d.value)).map(({ session, column, columnCount }) => {
              const course = coursesById.get(session.course_id)
              const start = timeToMinutes(session.start_time)
              const end = timeToMinutes(session.end_time)
              const blockHeight = Math.max(offset(end) - offset(start), 22)
              const clashes = clashMap.get(session.id) ?? []
              const label = [
                course ? `${course.course_code} ${course.course_name}` : 'Unknown course',
                `${d.long} ${formatTimeOfDay(session.start_time)} to ${formatTimeOfDay(session.end_time)}`,
                session.location,
                clashes.length > 0 &&
                  `Overlaps with ${clashes.map((c) => coursesById.get(c.course_id)?.course_code ?? 'another class').join(', ')}`,
              ]
                .filter(Boolean)
                .join(', ')

              return (
                <button
                  key={session.id}
                  type="button"
                  aria-label={label}
                  title={label}
                  onClick={() => editor.openEdit(session)}
                  className={cn(
                    'absolute overflow-hidden rounded-md border-l-[3px] px-1.5 py-1 text-left text-[11px] leading-tight text-foreground',
                    'hover:brightness-95 focus-visible:z-10 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
                  )}
                  style={{
                    top: offset(start) + 1,
                    height: blockHeight - 2,
                    left: `calc(${(column / columnCount) * 100}% + 2px)`,
                    width: `calc(${100 / columnCount}% - 4px)`,
                    borderLeftColor: course?.color,
                    // The course color at ~14% opacity as the background tint.
                    backgroundColor: `${course?.color ?? '#64748b'}24`,
                  }}
                >
                  <span className="flex items-start justify-between gap-1">
                    <span className="truncate font-semibold">{course?.course_code ?? '?'}</span>
                    {clashes.length > 0 && <AlertTriangle className="size-3 shrink-0 text-amber-600" aria-hidden />}
                  </span>
                  {blockHeight > 34 && (
                    <span className="block truncate text-muted-foreground">
                      {formatTimeOfDay(session.start_time)}–{formatTimeOfDay(session.end_time)}
                    </span>
                  )}
                  {blockHeight > 50 && session.location && (
                    <span className="block truncate text-muted-foreground">{session.location}</span>
                  )}
                </button>
              )
            })}

            {d.value === today && showNowLine && (
              <div className="pointer-events-none absolute inset-x-0 z-20 flex items-center" style={{ top: offset(nowMinutes) }} aria-hidden>
                <span className="-ml-1 size-2 rounded-full bg-red-500" />
                <span className="h-px flex-1 bg-red-500" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
