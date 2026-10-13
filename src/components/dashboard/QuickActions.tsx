import { BookOpen, ClipboardList, NotebookPen, Timer } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'

/**
 * Shortcuts to the pages where records are created. Each link opens the
 * relevant page; the add forms themselves are built in Stages 3–5.
 */
const ACTIONS = [
  { label: 'Add course', to: '/courses', icon: BookOpen },
  { label: 'Add assignment', to: '/assignments', icon: ClipboardList },
  { label: 'Add exam', to: '/exams', icon: NotebookPen },
  { label: 'Log study session', to: '/study', icon: Timer },
]

export function QuickActions() {
  return (
    <div className="flex flex-wrap gap-2">
      {ACTIONS.map(({ label, to, icon: Icon }) => (
        <Button key={to} asChild variant="outline" size="sm">
          <Link to={to}>
            <Icon aria-hidden />
            {label}
          </Link>
        </Button>
      ))}
    </div>
  )
}
