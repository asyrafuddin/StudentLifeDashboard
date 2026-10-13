import { BookOpen, ClipboardList, NotebookPen, Timer } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'

/**
 * Shortcuts to the pages where records are created. Course and assignment links open the
 * add form directly (?new=1); exams and study sessions arrive in Stages 4–5.
 */
const ACTIONS = [
  { label: 'Add course', to: '/courses?new=1', icon: BookOpen },
  { label: 'Add assignment', to: '/assignments?new=1', icon: ClipboardList },
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
