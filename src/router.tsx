import type { ComponentType } from 'react'
import { createBrowserRouter, type RouteObject } from 'react-router'
import { PublicOnly, RequireAuth } from '@/components/auth/RouteGuards'
import { FullPageSpinner } from '@/components/FullPageSpinner'
import { RouteError } from '@/components/RouteError'
import { AppLayout } from '@/layouts/AppLayout'
import { AuthLayout } from '@/layouts/AuthLayout'

/**
 * Loads a page's code only when it's first visited ("code splitting"), so the
 * first load is smaller and faster. E.g. the chart library is only downloaded
 * by pages that show charts.
 */
function page<M>(load: () => Promise<M>, name: keyof M & string): RouteObject['lazy'] {
  return async () => ({ Component: (await load())[name] as ComponentType })
}

/** The route table, exported separately so tests can run the real routes. */
export const routes: RouteObject[] = [
  // Public pages: only for signed-out visitors.
  {
    element: <PublicOnly />,
    errorElement: <RouteError />,
    hydrateFallbackElement: <FullPageSpinner />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          { path: 'login', lazy: page(() => import('@/pages/LoginPage'), 'LoginPage') },
          { path: 'signup', lazy: page(() => import('@/pages/SignUpPage'), 'SignUpPage') },
          { path: 'forgot-password', lazy: page(() => import('@/pages/ForgotPasswordPage'), 'ForgotPasswordPage') },
        ],
      },
    ],
  },
  // Choosing a new password: reached from a reset email (which signs the user
  // in for this purpose) or from Settings, so it's neither public-only nor private.
  {
    element: <AuthLayout />,
    errorElement: <RouteError />,
    hydrateFallbackElement: <FullPageSpinner />,
    children: [
      { path: 'update-password', lazy: page(() => import('@/pages/UpdatePasswordPage'), 'UpdatePasswordPage') },
    ],
  },
  // Private pages: require sign-in (or demo mode).
  {
    element: <RequireAuth />,
    // Last resort, if the layout itself fails.
    errorElement: <RouteError />,
    hydrateFallbackElement: <FullPageSpinner />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            // A crashing page shows the error inside the layout, so the sidebar still works.
            errorElement: <RouteError />,
            children: [
              { index: true, lazy: page(() => import('@/pages/DashboardPage'), 'DashboardPage') },
              { path: 'courses', lazy: page(() => import('@/pages/CoursesPage'), 'CoursesPage') },
              { path: 'courses/:courseId', lazy: page(() => import('@/pages/CourseDetailPage'), 'CourseDetailPage') },
              { path: 'assignments', lazy: page(() => import('@/pages/AssignmentsPage'), 'AssignmentsPage') },
              { path: 'exams', lazy: page(() => import('@/pages/ExamsPage'), 'ExamsPage') },
              { path: 'timetable', lazy: page(() => import('@/pages/TimetablePage'), 'TimetablePage') },
              { path: 'grades', lazy: page(() => import('@/pages/GradesPage'), 'GradesPage') },
              { path: 'study', lazy: page(() => import('@/pages/StudyPage'), 'StudyPage') },
              { path: 'assistant', lazy: page(() => import('@/pages/AssistantPage'), 'AssistantPage') },
              { path: 'settings', lazy: page(() => import('@/pages/SettingsPage'), 'SettingsPage') },
              { path: '*', lazy: page(() => import('@/pages/NotFoundPage'), 'NotFoundPage') },
            ],
          },
        ],
      },
    ],
  },
]

export const router = createBrowserRouter(routes)
