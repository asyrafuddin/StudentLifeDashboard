import { getISODay } from 'date-fns'
import { ClassSessionRow } from '@/components/timetable/ClassSessionRow'
import { Badge } from '@/components/ui/badge'
import type { ClassSessionEditor } from '@/hooks/useClassSessionEditor'
import { DAYS, timeToMinutes } from '@/lib/timetable'
import type { ClassSession, Course } from '@/types/database'

interface DayAgendaProps {
  sessions: ClassSession[]
  coursesById: Map<string, Course>
  clashMap: Map<string, ClassSession[]>
  editor: ClassSessionEditor
  now: Date
}

/** Phone-friendly timetable: one list per weekday, Monday to Sunday. */
export function DayAgenda({ sessions, coursesById, clashMap, editor, now }: DayAgendaProps) {
  const today = getISODay(now)

  return (
    <div className="space-y-4">
      {DAYS.map((d) => {
        const daySessions = sessions
          .filter((s) => s.day_of_week === d.value)
          .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time))
        return (
          <section key={d.value} aria-label={d.long}>
            <h2 className="mb-2 flex items-center gap-2 text-sm font-medium">
              {d.long}
              {d.value === today && <Badge>Today</Badge>}
            </h2>
            {daySessions.length === 0 ? (
              <p className="text-xs text-muted-foreground">No classes</p>
            ) : (
              <ul className="space-y-2">
                {daySessions.map((s) => (
                  <ClassSessionRow
                    key={s.id}
                    session={s}
                    course={coursesById.get(s.course_id)}
                    editor={editor}
                    clashes={clashMap.get(s.id)}
                    coursesById={coursesById}
                  />
                ))}
              </ul>
            )}
          </section>
        )
      })}
    </div>
  )
}
