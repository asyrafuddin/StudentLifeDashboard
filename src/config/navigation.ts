import {
  BookOpen,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  type LucideIcon,
  NotebookPen,
  Settings,
  Sparkles,
  Timer,
} from 'lucide-react'

export interface NavItem {
  label: string
  path: string
  icon: LucideIcon
}

/** Single source of truth for sidebar links and page titles. */
export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'My Courses', path: '/courses', icon: BookOpen },
  { label: 'Assignments', path: '/assignments', icon: ClipboardList },
  { label: 'Exams', path: '/exams', icon: NotebookPen },
  { label: 'Timetable', path: '/timetable', icon: CalendarDays },
  { label: 'Grades & GPA', path: '/grades', icon: GraduationCap },
  { label: 'Study Tracker', path: '/study', icon: Timer },
  { label: 'Study Assistant', path: '/assistant', icon: Sparkles },
]

export const SETTINGS_NAV_ITEM: NavItem = { label: 'Settings', path: '/settings', icon: Settings }
