import { ChevronRight, GraduationCap } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { formatNumber } from '@/lib/grades'
import { formatGpa, GPA_EXCLUSION_LABELS, type GpaResult } from '@/lib/gpa'

interface GpaSummaryProps {
  /** Omitted when viewing all semesters. */
  semester?: { name: string; result: GpaResult }
  cumulative: GpaResult
}

export function GpaSummary({ semester, cumulative }: GpaSummaryProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {semester && <GpaCard label={`Semester GPA · ${semester.name}`} result={semester.result} />}
      <GpaCard label="Cumulative GPA · all semesters" result={cumulative} />
    </div>
  )
}

function GpaCard({ label, result }: { label: string; result: GpaResult }) {
  const insufficient = result.gpa === null

  return (
    <Card size="sm">
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">{label}</p>
          <GraduationCap className="size-4 text-muted-foreground" aria-hidden />
        </div>
        <p className={insufficient ? 'text-base font-semibold text-muted-foreground' : 'text-2xl font-semibold tabular-nums'}>
          {formatGpa(result.gpa)}
        </p>
        <p className="text-xs text-muted-foreground">
          {insufficient
            ? 'No course has a finalized grade with grade points yet.'
            : `From ${result.included.length} ${result.included.length === 1 ? 'course' : 'courses'}, ${formatNumber(result.totalCredits)} credits`}
        </p>

        {/* Always explain which courses didn't count, and why. */}
        {result.excluded.length > 0 && (
          <details className="group text-xs">
            <summary className="flex cursor-pointer list-none items-center gap-1 text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
              <ChevronRight className="size-3.5 transition-transform group-open:rotate-90" aria-hidden />
              {result.excluded.length} {result.excluded.length === 1 ? 'course' : 'courses'} not counted
            </summary>
            <ul className="mt-1.5 space-y-0.5 pl-4.5">
              {result.excluded.map(({ course, reason }) => (
                <li key={course.id}>
                  <span className="font-medium">{course.course_code}</span>
                  <span className="text-muted-foreground">: {GPA_EXCLUSION_LABELS[reason]}</span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </CardContent>
    </Card>
  )
}
