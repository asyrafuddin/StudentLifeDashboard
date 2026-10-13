import { createBrowserRouter } from 'react-router'
import { AppLayout } from '@/layouts/AppLayout'
import { AssignmentsPage } from '@/pages/AssignmentsPage'
import { CoursesPage } from '@/pages/CoursesPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { ExamsPage } from '@/pages/ExamsPage'
import { GradesPage } from '@/pages/GradesPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { StudyPage } from '@/pages/StudyPage'
import { TimetablePage } from '@/pages/TimetablePage'

/**
 * All app routes. Every page renders inside AppLayout (sidebar + content).
 * Stage 2 will add /login and wrap these routes in an auth guard.
 */
export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'courses', element: <CoursesPage /> },
      { path: 'assignments', element: <AssignmentsPage /> },
      { path: 'exams', element: <ExamsPage /> },
      { path: 'timetable', element: <TimetablePage /> },
      { path: 'grades', element: <GradesPage /> },
      { path: 'study', element: <StudyPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
