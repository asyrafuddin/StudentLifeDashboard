import { Menu } from 'lucide-react'
import { useState } from 'react'
import { Outlet } from 'react-router'
import { OfflineBanner } from '@/components/layout/OfflineBanner'
import { SidebarNav } from '@/components/layout/SidebarNav'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'

/**
 * The shell around every signed-in page:
 *  - desktop (lg and up): fixed sidebar on the left
 *  - smaller screens: a top bar with a menu button that slides the sidebar in
 */
export function AppLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <div className="min-h-svh bg-background">
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

      <main className="lg:pl-60">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <OfflineBanner />
          <Outlet />
        </div>
      </main>
    </div>
  )
}
