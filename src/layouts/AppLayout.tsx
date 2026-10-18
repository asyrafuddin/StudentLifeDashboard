import { Menu } from 'lucide-react'
import { type RefObject, useEffect, useRef, useState } from 'react'
import { Outlet, ScrollRestoration, useLocation, useNavigation } from 'react-router'
import { OfflineBanner } from '@/components/layout/OfflineBanner'
import { SidebarNav } from '@/components/layout/SidebarNav'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { usePageTitle } from '@/hooks/usePageTitle'

/**
 * The shell around every signed-in page:
 *  - desktop (lg and up): fixed sidebar on the left
 *  - smaller screens: a top bar with a menu button that slides the sidebar in
 *
 * Accessibility: a "Skip to main content" link (first thing the Tab key
 * reaches), a page title per route, and focus moved to the new page after
 * navigating, so keyboard and screen-reader users start reading there.
 */
export function AppLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const navigation = useNavigation()
  const mainRef = useRef<HTMLElement>(null)
  usePageTitle()
  useFocusMainOnNavigate(mainRef)

  return (
    <div className="min-h-svh bg-background">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to main content
      </a>

      {/* Thin bar while the next page's code downloads (a visual cue only). */}
      {navigation.state === 'loading' && (
        <div className="fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden bg-primary/20" aria-hidden>
          <div className="h-full w-1/3 animate-[nav-progress_1s_ease-in-out_infinite] bg-primary" />
        </div>
      )}

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r bg-sidebar lg:block">
        <SidebarNav />
      </aside>

      <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur lg:hidden">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Open navigation menu"
          onClick={() => setMobileNavOpen(true)}
        >
          <Menu />
        </Button>
        <span className="font-semibold tracking-tight">Student Life</span>
      </header>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-64 p-0">
          {/* Screen-reader title/description required by the dialog primitive. */}
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">Go to a section of the app.</SheetDescription>
          <SidebarNav onNavigate={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>

      <main id="main-content" ref={mainRef} tabIndex={-1} className="outline-none lg:pl-60">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <OfflineBanner />
          <Outlet />
        </div>
      </main>

      {/* New pages open at the top; Back/Forward return to where you were. */}
      <ScrollRestoration />
    </div>
  )
}

/**
 * After moving to another page, put focus on the main area, unless the new
 * page already focused something itself (e.g. an "Add course" form opened by
 * a link). Not on the first load, where the browser's default is right.
 */
function useFocusMainOnNavigate(mainRef: RefObject<HTMLElement | null>) {
  const { pathname } = useLocation()
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    const active = document.activeElement
    const focusIsIdle = !active || active === document.body || active.closest('nav, header') !== null
    if (focusIsIdle) mainRef.current?.focus({ preventScroll: true })
  }, [pathname, mainRef])
}
