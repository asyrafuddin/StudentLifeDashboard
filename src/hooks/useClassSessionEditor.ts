import { type RecordDialogState, useRecordDialogs } from '@/hooks/useRecordDialogs'
import { deleteClassSession } from '@/services/classSessions'
import type { ClassSession, DayOfWeek } from '@/types/database'

/** Add / edit / delete dialogs for timetable classes. Render <ClassSessionDialogs> with the result. */

/** What a new class can be pre-filled with, e.g. from clicking an empty timetable slot. */
export interface ClassSessionDefaults {
  courseId?: string
  dayOfWeek?: DayOfWeek
  /** "HH:MM" */
  startTime?: string
}

export type ClassSessionDialogState = RecordDialogState<ClassSession, ClassSessionDefaults>

interface Options {
  onChanged: () => void
  initialDialog?: ClassSessionDialogState
}

export function useClassSessionEditor(options: Options) {
  return useRecordDialogs<ClassSession, ClassSessionDefaults>({
    ...options,
    remove: (session) => deleteClassSession(session.id),
    deletedMessage: () => 'Class removed from your timetable',
  })
}

export type ClassSessionEditor = ReturnType<typeof useClassSessionEditor>
