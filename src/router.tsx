import { createBrowserRouter } from 'react-router'
import { PublicOnly, RequireAuth } from '@/components/auth/RouteGuards'
import { AppLayout } from '@/layouts/AppLayout'
import { AuthLayout } from '@/layouts/AuthLayout'
import { AssignmentsPage } from '@/pages/AssignmentsPage'
import { CoursesPage } from '@/pages/CoursesPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { ExamsPage } from '@/pages/ExamsPage'
import { GradesPage } from '@/pages/GradesPage'
import { LoginPage } from '@/pages/LoginPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { SignUpPage } from '@/pages/SignUpPage'
import { StudyPage } from '@/pages/StudyPage'
import { TimetablePage } from '@/pages/TimetablePage'

export const router = createBrowserRouter([
  // Public pages: only for signed-out visitors.
  {
    element: <PublicOnly />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          { path: 'login', element: <LoginPage /> },
          { path: 'signup', element: <SignUpPage /> },
        ],
      },
    ],
  },
  // Private pages: require sign-in (or demo mode).
  {
    element: <RequireAuth />,
    children: [
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
    ],
  },
])
