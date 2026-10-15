import { Pencil, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router'
import { toast } from 'sonner'
import { ListSkeleton, LoadError } from '@/components/AsyncStatus'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { FormDialog } from '@/components/form/FormDialog'
import { GradeScaleEntryForm } from '@/components/settings/GradeScaleEntryForm'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAsync } from '@/hooks/useAsync'
import { useRecordDialogs } from '@/hooks/useRecordDialogs'
import { getErrorMessage } from '@/lib/errors'
import { formatNumber, GRADE_SCALE_PRESETS, sortScale } from '@/lib/grades'
import { deleteGradeScaleEntry, listGradeScale, replaceGradeScale } from '@/services/grades'
import type { GradeScaleEntry } from '@/types/database'

type Preset = (typeof GRADE_SCALE_PRESETS)[number]

/**
 * The user's grading scale: which letter grades exist and how many grade
 * points each is worth. Nothing is assumed: it starts empty, and presets are
 * only applied when the user picks one.
 */
export function GradeScaleSection() {
  const state = useAsync(listGradeScale)
  const ready = state.status === 'ready' ? state : null
  const reload = () => ready?.reload()
  const dialogs = useRecordDialogs<GradeScaleEntry>({
    onChanged: reload,
    remove: (entry) => deleteGradeScaleEntry(entry.id),
    deletedMessage: (entry) => `Removed ${entry.grade_letter} from your scale`,
  })
  const [pendingPreset, setPendingPreset] = useState<Preset | null>(null)
  const sectionRef = useRef<HTMLDivElement>(null)
  const { hash } = useLocation()
  const isLoaded = ready !== null

  // Links like "/settings#grading-scale" (from the Grades page) jump here once it has loaded.
  useEffect(() => {
    if (isLoaded && hash === '#grading-scale') sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [isLoaded, hash])

  const scale = sortScale(ready?.data ?? [])

  const applyPreset = async (preset: Preset) => {
    try {
      await replaceGradeScale(preset.entries.map(([grade_letter, grade_points]) => ({ grade_letter, grade_points })))
      toast.success(`Grading scale set to “${preset.name}”`)
      reload()
    } catch (error) {
      toast.error(getErrorMessage(error))
      throw error
    }
  }

  const choosePreset = (preset: Preset) => {
    // Replacing an existing scale needs confirmation; an empty one doesn't.
    if (scale.length > 0) setPendingPreset(preset)
    else void applyPreset(preset).catch(() => {})
  }

  return (
    <Card id="grading-scale" ref={sectionRef} className="scroll-mt-6">
      <CardHeader>
        <CardTitle>Grading scale</CardTitle>
        <CardDescription>
          The letter grades your university uses and their grade points. Used to fill in grade points when you enter a
          final course grade.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {state.status === 'loading' && <ListSkeleton rows={2} />}
        {state.status === 'error' && <LoadError message={state.message} onRetry={state.retry} />}

        {ready && (
          <>
            {scale.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No grades yet. Add your university's grades below, or start from a common scale and adjust it.
              </p>
            ) : (
              <table className="w-full max-w-sm text-sm">
                <caption className="sr-only">Your grading scale</caption>
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th scope="col" className="py-2 font-medium">Letter</th>
                    <th scope="col" className="py-2 text-right font-medium">Grade points</th>
                    <th scope="col" className="w-20 py-2"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {scale.map((entry) => (
                    <tr key={entry.id} className="border-b last:border-b-0">
                      <th scope="row" className="py-1.5 text-left font-medium">{entry.grade_letter}</th>
                      <td className="py-1.5 text-right tabular-nums">{formatNumber(entry.grade_points)}</td>
                      <td className="py-1 text-right">
                        <Button variant="ghost" size="icon-sm" aria-label={`Edit ${entry.grade_letter}`} onClick={() => dialogs.openEdit(entry)}>
                          <Pencil />
                        </Button>
                        <Button variant="ghost" size="icon-sm" aria-label={`Remove ${entry.grade_letter}`} onClick={() => dialogs.openDelete(entry)}>
                          <Trash2 />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <GradeScaleEntryForm onSaved={reload} />

            <div className="space-y-2 border-t pt-4">
              <p className="text-sm font-medium">Start from a common scale</p>
              <div className="flex flex-wrap gap-2">
                {GRADE_SCALE_PRESETS.map((preset) => (
                  <Button key={preset.id} variant="outline" size="sm" onClick={() => choosePreset(preset)} title={preset.description}>
                    {preset.name}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Check it against your university's official scale and edit any differences. Changing the scale doesn't
                change final grades you've already saved.
              </p>
            </div>
          </>
        )}
      </CardContent>

      <FormDialog
        open={dialogs.dialog.kind === 'edit'}
        onOpenChange={(open) => !open && dialogs.close()}
        title="Edit grade"
      >
        {dialogs.dialog.kind === 'edit' && (
          <GradeScaleEntryForm entry={dialogs.dialog.item} onSaved={dialogs.handleSaved} onCancel={dialogs.close} />
        )}
      </FormDialog>

      <ConfirmDialog
        open={dialogs.dialog.kind === 'delete'}
        onOpenChange={(open) => !open && dialogs.close()}
        title={dialogs.dialog.kind === 'delete' ? `Remove ${dialogs.dialog.item.grade_letter}?` : 'Remove grade?'}
        description="Final grades you've already saved keep their grade points."
        confirmLabel="Remove"
        onConfirm={() => (dialogs.dialog.kind === 'delete' ? dialogs.confirmDelete(dialogs.dialog.item) : Promise.resolve())}
      />

      <ConfirmDialog
        open={pendingPreset !== null}
        onOpenChange={(open) => !open && setPendingPreset(null)}
        title="Replace your grading scale?"
        description={
          <>
            Your current {scale.length} {scale.length === 1 ? 'grade' : 'grades'} will be replaced with “{pendingPreset?.name}”.
            Final grades you've already saved keep their grade points.
          </>
        }
        confirmLabel="Replace scale"
        onConfirm={() => (pendingPreset ? applyPreset(pendingPreset) : Promise.resolve())}
      />
    </Card>
  )
}
