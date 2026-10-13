import { GraduationCap } from 'lucide-react'
import { NavLink } from 'react-router'
import { AccountMenu } from '@/components/layout/AccountMenu'
import { NAV_ITEMS, type NavItem, SETTINGS_NAV_ITEM } from '@/config/navigation'
import { cn } from '@/lib/utils'

interface SidebarNavProps {
  /** Called after a link is clicked — the mobile menu uses this to close itself. */
  onNavigate?: () => void
}

/** Brand + navigation links. Shared by the desktop sidebar and the mobile menu. */
export function SidebarNav({ onNavigate }: SidebarNavProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center gap-2 px-4">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <GraduationCap className="size-4.5" aria-hidden />
        </div>
        <span className="font-semibold tracking-tight">Student Life</span>
      </div>

      <nav aria-label="Main" className="flex flex-1 flex-col gap-1 px-3 py-2">
        {NAV_ITEMS.map((item) => (
          <SidebarLink key={item.path} item={item} onNavigate={onNavigate} />
        ))}
        <div className="mt-auto space-y-2 pt-2 pb-3">
          <SidebarLink item={SETTINGS_NAV_ITEM} onNavigate={onNavigate} />
          <AccountMenu />
        </div>
      </nav>
    </div>
  )
}

function SidebarLink({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors',
          'hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
          isActive && 'bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        )
      }
    >
      <Icon className="size-4" aria-hidden />
      {item.label}
    </NavLink>
  )
}
