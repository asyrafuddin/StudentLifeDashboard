import { type RecordDialogState, useRecordDialogs } from '@/hooks/useRecordDialogs'
import { deleteExam } from '@/services/exams'
import type { Exam } from '@/types/database'

/** Add / edit / delete dialogs for exams. Render <ExamDialogs> with the result. */

export type ExamDialogState = RecordDialogState<Exam, { courseId?: string }>

interface Options {
  onChanged: () => void
  initialDialog?: ExamDialogState
}

export function useExamEditor(options: Options) {
  return useRecordDialogs<Exam, { courseId?: string }>({
    ...options,
    remove: (exam) => deleteExam(exam.id),
    deletedMessage: (exam) => `Deleted “${exam.title}”`,
  })
}

export type ExamEditor = ReturnType<typeof useExamEditor>
