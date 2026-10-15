import { BookOpen, ClipboardList, NotebookPen, Timer } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'

/**
 * Shortcuts that open each page's add form directly (?new=1).
 */
const ACTIONS = [
  { label: 'Add course', to: '/courses?new=1', icon: BookOpen },
  { label: 'Add assignment', to: '/assignments?new=1', icon: ClipboardList },
  { label: 'Add exam', to: '/exams?new=1', icon: NotebookPen },
  { label: 'Log study session', to: '/study?new=1', icon: Timer },
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
