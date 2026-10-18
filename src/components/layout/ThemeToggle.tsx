import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { THEME_OPTIONS } from '@/lib/theme'

const ICONS = { light: Sun, dark: Moon, system: Monitor }

/** Small sidebar button to switch between light, dark and the device's setting. */
export function ThemeToggle() {
  const { theme = 'system', resolvedTheme, setTheme } = useTheme()
  const Icon = resolvedTheme === 'dark' ? Moon : Sun

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Theme" title="Theme">
          <Icon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top">
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        {/* Radio items, so screen readers announce which one is selected. */}
        <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
          {THEME_OPTIONS.map((option) => {
            const OptionIcon = ICONS[option.value]
            return (
              <DropdownMenuRadioItem key={option.value} value={option.value}>
                <OptionIcon aria-hidden />
                {option.label}
              </DropdownMenuRadioItem>
            )
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
