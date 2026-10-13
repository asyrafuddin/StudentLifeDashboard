import { AlertTriangle } from 'lucide-react'
import { DAYS } from '@/lib/timetable'
import type { ClassSession, Course } from '@/types/database'
import { formatTimeOfDay } from '@/utils/format'

interface ClashNoticeProps {
  clashMap: Map<string, ClassSession[]>
  sessions: ClassSession[]
  coursesById: Map<string, Course>
}

/** Lists each pair of overlapping classes once, so clashes are never silent. */
export function ClashNotice({ clashMap, sessions, coursesById }: ClashNoticeProps) {
  const byId = new Map(sessions.map((s) => [s.id, s]))
  const pairs: Array<[ClassSession, ClassSession]> = []
  const seen = new Set<string>()
  for (const [id, clashes] of clashMap) {
    for (const other of clashes) {
      const key = [id, other.id].sort().join('|')
      if (!seen.has(key)) {
        seen.add(key)
        pairs.push([byId.get(id)!, other])
      }
    }
  }
  if (pairs.length === 0) return null

  const describe = (s: ClassSession) =>
    `${coursesById.get(s.course_id)?.course_code ?? 'A class'} (${formatTimeOfDay(s.start_time)}–${formatTimeOfDay(s.end_time)})`

  return (
    <div role="status" className="flex gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div>
        <p className="font-medium">
          {pairs.length === 1 ? '2 classes overlap' : `${pairs.length} pairs of classes overlap`}
        </p>
        <ul className="mt-1 space-y-0.5 text-amber-900/90 dark:text-amber-100/90">
          {pairs.map(([a, b]) => (
            <li key={`${a.id}|${b.id}`}>
              {DAYS.find((d) => d.value === a.day_of_week)?.long}: {describe(a)} and {describe(b)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
