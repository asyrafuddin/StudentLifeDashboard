import { Check } from 'lucide-react'
import { COURSE_COLORS } from '@/lib/schemas'
import { cn } from '@/lib/utils'

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
  id?: string
  'aria-describedby'?: string
}

/** Preset swatches plus a custom color input. */
export function ColorPicker({ value, onChange, id, ...aria }: ColorPickerProps) {
  const current = value.toLowerCase()
  const isPreset = COURSE_COLORS.some((c) => c.value === current)

  return (
    <div id={id} role="radiogroup" aria-label="Course color" {...aria} className="flex flex-wrap items-center gap-2">
      {COURSE_COLORS.map((color) => {
        const selected = current === color.value
        return (
          <button
            key={color.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={color.name}
            title={color.name}
            onClick={() => onChange(color.value)}
            className={cn(
              'flex size-7 items-center justify-center rounded-full ring-offset-2 ring-offset-background transition-shadow',
              'focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
              selected && 'ring-2 ring-foreground',
            )}
            style={{ backgroundColor: color.value }}
          >
            {selected && <Check className="size-4 text-white" aria-hidden />}
          </button>
        )
      })}
      <label
        className={cn(
          'relative flex size-7 cursor-pointer items-center justify-center overflow-hidden rounded-full border text-xs text-muted-foreground',
          !isPreset && 'ring-2 ring-foreground ring-offset-2 ring-offset-background',
        )}
        title="Custom color"
        style={!isPreset ? { backgroundColor: value } : undefined}
      >
        {isPreset && <span aria-hidden>+</span>}
        <span className="sr-only">Custom color</span>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
    </div>
  )
}
