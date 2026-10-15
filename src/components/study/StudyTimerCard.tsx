import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { AlertTriangle, Loader2, Play, Square } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { CourseLabel } from '@/components/CourseLabel'
import { FormField } from '@/components/form/FormField'
import { NativeSelect } from '@/components/form/NativeSelect'
import { CourseOptions } from '@/components/study/CourseOptions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useNow } from '@/hooks/useNow'
import { getErrorMessage } from '@/lib/errors'
import { type StudyTimerFormInput, type StudyTimerFormValues, studyTimerSchema } from '@/lib/schemas'
import { elapsedSeconds, formatDuration, formatTimer, MAX_SESSION_SECONDS } from '@/lib/study'
import { deleteStudySession, startStudySession, stopStudySession } from '@/services/study'
import type { Course, Semester, StudySession } from '@/types/database'

interface StudyTimerCardProps {
  running: StudySession | null
  courses: Course[]
  semesters: Semester[]
  onChanged: () => void
  /** For a timer left running over 24 hours: ask the user for the real duration. */
  onFixTooLong: (session: StudySession) => void
}

export function StudyTimerCard({ running, courses, semesters, onChanged, onFixTooLong }: StudyTimerCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Study timer</CardTitle>
        <CardDescription>
          {running ? 'Saved as you go: closing the page won’t lose it.' : 'Start it when you sit down to study.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {running ? (
          <RunningTimer session={running} courses={courses} onChanged={onChanged} onFixTooLong={onFixTooLong} />
        ) : (
          <StartTimerForm courses={courses} semesters={semesters} onChanged={onChanged} />
        )}
      </CardContent>
    </Card>
  )
}

function StartTimerForm({ courses, semesters, onChanged }: { courses: Course[]; semesters: Semester[]; onChanged: () => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<StudyTimerFormInput, unknown, StudyTimerFormValues>({
    resolver: zodResolver(studyTimerSchema),
    defaultValues: { course_id: '', notes: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    try {
      await startStudySession(values)
      onChanged()
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormField label="Course" error={errors.course_id?.message} hint="Optional">
        <NativeSelect {...register('course_id')}>
          <CourseOptions courses={courses} semesters={semesters} />
        </NativeSelect>
      </FormField>
      <FormField label="What are you working on?" error={errors.notes?.message} hint="Optional">
        <Input placeholder="e.g. Chapter 4 practice problems" {...register('notes')} />
      </FormField>
      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="animate-spin" aria-hidden /> : <Play aria-hidden />}
        Start studying
      </Button>
    </form>
  )
}

function RunningTimer({
  session,
  courses,
  onChanged,
  onFixTooLong,
}: {
  session: StudySession
  courses: Course[]
  onChanged: () => void
  onFixTooLong: (session: StudySession) => void
}) {
  // Re-render every second for the clock. Only this small component ticks.
  const now = useNow(1000)
  const [stopping, setStopping] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const elapsed = elapsedSeconds(session.started_at, now)
  const tooLong = elapsed > MAX_SESSION_SECONDS
  const course = courses.find((c) => c.id === session.course_id)

  const handleStop = async () => {
    setStopping(true)
    try {
      const saved = await stopStudySession(session)
      toast.success(`Saved ${formatDuration(saved.duration_seconds ?? 0)} of study`)
      onChanged()
    } catch (error) {
      toast.error(getErrorMessage(error))
      setStopping(false)
    }
  }

  const handleDiscard = async () => {
    try {
      await deleteStudySession(session.id)
      toast.success('Timer discarded')
      onChanged()
    } catch (error) {
      toast.error(getErrorMessage(error))
      throw error
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-4xl font-semibold tracking-tight tabular-nums" role="timer" aria-label={`Studying for ${formatDuration(elapsed)}`}>
          {formatTimer(elapsed)}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {course ? <CourseLabel course={course} /> : 'No specific course'} · started {format(new Date(session.started_at), 'h:mm a, EEE d MMM')}
        </p>
        {session.notes && <p className="mt-1 text-sm">{session.notes}</p>}
      </div>

      {tooLong ? (
        <div className="space-y-3">
          <p className="flex gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-100">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            This timer has been running for over 24 hours, so it was probably left on by accident. Enter how long you
            actually studied.
          </p>
          <Button className="w-full" onClick={() => onFixTooLong(session)}>
            Enter actual duration
          </Button>
        </div>
      ) : (
        <Button size="lg" className="w-full" onClick={handleStop} disabled={stopping}>
          {stopping ? <Loader2 className="animate-spin" aria-hidden /> : <Square aria-hidden />}
          Stop and save
        </Button>
      )}
      <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={() => setConfirmDiscard(true)}>
        Discard this timer
      </Button>

      <ConfirmDialog
        open={confirmDiscard}
        onOpenChange={setConfirmDiscard}
        title="Discard this timer?"
        description="The time on this timer won't be recorded."
        confirmLabel="Discard"
        onConfirm={handleDiscard}
      />
    </div>
  )
}
