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

const APP_NAME = 'Student Life'

/** Titles for pages that aren't in the sidebar. */
const OTHER_TITLES: Record<string, string> = {
  '/login': 'Sign in',
  '/signup': 'Create an account',
  '/forgot-password': 'Reset your password',
  '/update-password': 'Choose a new password',
}

/** The browser-tab title for a path, e.g. "Assignments · Student Life". */
export function pageTitle(pathname: string): string {
  const item = [...NAV_ITEMS, SETTINGS_NAV_ITEM].find((i) =>
    i.path === '/' ? pathname === '/' : pathname === i.path || pathname.startsWith(`${i.path}/`),
  )
  const label = item?.label ?? OTHER_TITLES[pathname]
  return label ? `${label} · ${APP_NAME}` : APP_NAME
}
