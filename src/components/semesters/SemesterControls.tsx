import { format, parseISO } from 'date-fns'
import { CalendarRange, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Semester } from '@/types/database'

export const ALL_SEMESTERS = 'all'

interface SemesterControlsProps {
  semesters: Semester[]
  /** A semester id, or ALL_SEMESTERS. */
  value: string
  onValueChange: (value: string) => void
  onAdd: () => void
  onEdit: (semester: Semester) => void
  onDelete: (semester: Semester) => void
}

const formatRange = (s: Semester) =>
  `${format(parseISO(s.start_date), 'd MMM yyyy')} – ${format(parseISO(s.end_date), 'd MMM yyyy')}`

/** Semester filter for the course list, with add/edit/delete for semesters. */
export function SemesterControls({ semesters, value, onValueChange, onAdd, onEdit, onDelete }: SemesterControlsProps) {
  const selected = semesters.find((s) => s.id === value)

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-card p-3 ring-1 ring-foreground/10 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <Select value={value} onValueChange={onValueChange}>
          <SelectTrigger className="w-full sm:w-64" aria-label="Show courses from">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_SEMESTERS}>All semesters</SelectItem>
            {semesters.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
                {s.is_current && ' (current)'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selected && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={`Actions for ${selected.name}`}>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onSelect={() => onEdit(selected)}>
                <Pencil /> Edit semester
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onSelect={() => onDelete(selected)}>
                <Trash2 /> Delete semester
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {selected && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarRange className="size-3.5" aria-hidden />
          {formatRange(selected)}
        </p>
      )}

      <Button variant="outline" size="sm" onClick={onAdd}>
        <Plus aria-hidden /> New semester
      </Button>
    </div>
  )
}
