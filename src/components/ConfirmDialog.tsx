import { Loader2 } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: ReactNode
  /** Extra content between the description and the buttons. */
  children?: ReactNode
  confirmLabel: string
  /**
   * If set, the user must type this exact text to enable the confirm button.
   * Used for deletions that also remove lots of related data.
   */
  requireTypedText?: string
  /** Should throw on failure; the dialog stays open so the user can retry. */
  onConfirm: () => Promise<void>
}

/** "Are you sure?" dialog for destructive actions. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  confirmLabel,
  requireTypedText,
  onConfirm,
}: ConfirmDialogProps) {
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const canConfirm = !busy && (!requireTypedText || typed.trim() === requireTypedText)

  const handleOpenChange = (next: boolean) => {
    if (busy) return // don't close mid-request
    if (!next) setTyped('')
    onOpenChange(next)
  }

  const handleConfirm = async () => {
    setBusy(true)
    try {
      await onConfirm()
      setTyped('')
      onOpenChange(false)
    } catch {
      // The caller shows the error (toast); keep the dialog open for a retry.
    } finally {
      setBusy(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription asChild><div>{description}</div></AlertDialogDescription>}
        </AlertDialogHeader>

        {children}

        {requireTypedText && (
          <div className="space-y-1.5">
            <Label htmlFor="confirm-typed-text">
              Type <span className="font-mono font-semibold">{requireTypedText}</span> to confirm
            </Label>
            <Input
              id="confirm-typed-text"
              autoComplete="off"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
            />
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          {/* A plain Button (not AlertDialogAction) so the dialog stays open while deleting. */}
          <Button variant="destructive" onClick={handleConfirm} disabled={!canConfirm}>
            {busy && <Loader2 className="animate-spin" aria-hidden />}
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
