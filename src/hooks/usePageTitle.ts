import { useEffect } from 'react'
import { useLocation } from 'react-router'
import { pageTitle } from '@/config/navigation'

/** Keeps the browser-tab title in sync with the current page (screen readers announce it too). */
export function usePageTitle(): void {
  const { pathname } = useLocation()
  useEffect(() => {
    document.title = pageTitle(pathname)
  }, [pathname])
}
