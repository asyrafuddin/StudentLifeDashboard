/**
 * Theme settings. index.html has a tiny script that reads the same key to
 * apply dark mode before the page appears (no white flash); keep them in sync.
 */
export const THEME_STORAGE_KEY = 'theme'

export const THEME_OPTIONS = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'Same as device' },
] as const

export type ThemeChoice = (typeof THEME_OPTIONS)[number]['value']
