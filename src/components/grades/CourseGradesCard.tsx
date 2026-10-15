import { AlertTriangle, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
import { Link } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { GradesEditor } from '@/hooks/useGradesEditor'
import { assessmentPercent, calculateCourseStanding, formatNumber, getGradeWarnings } from '@/lib/grades'
import type { Course, CourseResult, GradeEntry } from '@/types/database'

interface CourseGradesCardProps {
  course: Course
  entries: GradeEntry[]
  result: CourseResult | undefined
  editor: GradesEditor
  /** Link the course name to its page (off when already on that page). */
  linkToCourse?: boolean
}

/**
 * One course's grades, with the three levels kept visibly separate:
 * assessment scores (table), the calculated course result, and the final grade.
 */
export function CourseGradesCard({ course, entries, result, editor, linkToCourse = true }: CourseGradesCardProps) {
  const standing = calculateCourseStanding(entries)
  const warnings = getGradeWarnings(entries)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: course.color }} aria-hidden />
          {linkToCourse ? (
            <Link to={`/courses/${course.id}`} className="hover:underline">
              {course.course_code} · {course.course_name}
            </Link>
          ) : (
            'Grades'
          )}
        </CardTitle>
        <CardDescription>
          {course.credits} {course.credits === 1 ? 'credit' : 'credits'}
        </CardDescription>
        <CardAction>
          <Button variant="outline" size="sm" onClick={() => editor.entries.openCreate({ courseId: course.id })}>
            <Plus aria-hidden /> Assessment
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Calculated result vs. official final grade, side by side. */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-muted/60 p-3">
            <p className="text-xs font-medium text-muted-foreground">Course result (calculated)</p>
            {standing.status === 'ok' ? (
              <>
                <p className="mt-1 text-xl font-semibold tabular-nums">{formatNumber(standing.average, 1)}%</p>
                <p className="text-xs text-muted-foreground">
                  {standing.isComplete
                    ? 'All assessments graded'
                    : `Weighted average of the ${formatNumber(standing.gradedWeight)}% of the course graded so far`}
                </p>
              </>
            ) : (
              <>
                <p className="mt-1 font-medium text-muted-foreground">Insufficient data</p>
                <p className="text-xs text-muted-foreground">{standing.reason}</p>
              </>
            )}
          </div>

          <div className="rounded-lg bg-muted/60 p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-medium text-muted-foreground">Final grade (official)</p>
              <Button variant="link" size="xs" className="h-auto p-0" onClick={() => editor.openResult(course)}>
                {result ? 'Edit' : 'Set'}
              </Button>
            </div>
            {result && (result.final_grade_letter || result.final_grade_points !== null) ? (
              <>
                <p className="mt-1 flex flex-wrap items-baseline gap-2">
                  <span className="text-xl font-semibold">{result.final_grade_letter ?? '–'}</span>
                  {result.final_grade_points !== null && (
                    <span className="text-sm text-muted-foreground tabular-nums">
                      {formatNumber(result.final_grade_points)} points
                    </span>
                  )}
                </p>
                {result.is_finalized ? (
                  <Badge className="bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-200">Finalized</Badge>
                ) : (
                  <Badge variant="secondary">Not finalized: not in GPA</Badge>
                )}
              </>
            ) : (
              <>
                <p className="mt-1 font-medium text-muted-foreground">Not set</p>
                <p className="text-xs text-muted-foreground">Enter it when your university releases it.</p>
              </>
            )}
          </div>
        </div>

        {warnings.length > 0 && (
          <ul className="space-y-1 text-xs text-amber-800 dark:text-amber-200">
            {warnings.map((w) => (
              <li key={w} className="flex gap-1.5">
                <AlertTriangle className="mt-0.5 size-3 shrink-0" aria-hidden />
                {w}
              </li>
            ))}
          </ul>
        )}

        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No assessment scores yet. Add quizzes, assignments and exams with their weights to see a calculated result.
          </p>
        ) : (
          // Scrolls sideways inside the card on narrow screens instead of widening the page.
          <div className="-mx-1 overflow-x-auto px-1">
            <table className="w-full min-w-md text-sm">
              <caption className="sr-only">Assessment scores for {course.course_code}</caption>
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th scope="col" className="py-2 pr-2 font-medium">Assessment</th>
                  <th scope="col" className="px-2 py-2 text-right font-medium">Score</th>
                  <th scope="col" className="px-2 py-2 text-right font-medium">%</th>
                  <th scope="col" className="px-2 py-2 text-right font-medium">Weight</th>
                  <th scope="col" className="w-8 py-2"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => {
                  const pct = assessmentPercent(e)
                  return (
                    <tr key={e.id} className="border-b last:border-b-0">
                      <th scope="row" className="py-2 pr-2 text-left font-normal">{e.assessment_name}</th>
                      <td className="px-2 py-2 text-right tabular-nums">
                        {e.score === null ? (
                          <span className="text-muted-foreground">Not graded</span>
                        ) : (
                          `${formatNumber(e.score)} / ${formatNumber(e.max_score!)}`
                        )}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums">{pct === null ? '–' : `${formatNumber(pct, 1)}%`}</td>
                      <td className="px-2 py-2 text-right tabular-nums">
                        {e.weight_percent === null ? <span className="text-muted-foreground">–</span> : `${formatNumber(e.weight_percent)}%`}
                      </td>
                      <td className="py-1 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm" aria-label={`Actions for “${e.assessment_name}”`}>
                              <MoreHorizontal />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => editor.entries.openEdit(e)}>
                              <Pencil /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem variant="destructive" onSelect={() => editor.entries.openDelete(e)}>
                              <Trash2 /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
