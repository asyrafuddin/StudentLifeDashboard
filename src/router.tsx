import { createBrowserRouter, type RouteObject } from 'react-router'
import { PublicOnly, RequireAuth } from '@/components/auth/RouteGuards'
import { RouteError } from '@/components/RouteError'
import { AppLayout } from '@/layouts/AppLayout'
import { AuthLayout } from '@/layouts/AuthLayout'
import { AssignmentsPage } from '@/pages/AssignmentsPage'
import { CourseDetailPage } from '@/pages/CourseDetailPage'
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

/** The route table, exported separately so tests can run the real routes. */
export const routes: RouteObject[] = [
  // Public pages: only for signed-out visitors.
  {
    element: <PublicOnly />,
    errorElement: <RouteError />,
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
    // Last resort, if the layout itself fails.
    errorElement: <RouteError />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            // A crashing page shows the error inside the layout, so the sidebar still works.
            errorElement: <RouteError />,
            children: [
              { index: true, element: <DashboardPage /> },
              { path: 'courses', element: <CoursesPage /> },
              { path: 'courses/:courseId', element: <CourseDetailPage /> },
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
    ],
  },
]

export const router = createBrowserRouter(routes)
