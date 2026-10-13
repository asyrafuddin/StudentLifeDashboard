import { ComingSoon } from '@/components/ComingSoon'

export function SettingsPage() {
  return (
    <ComingSoon
      title="Settings"
      description="Your profile and preferences."
      stage={2}
      plannedFeatures={[
        'Update your display name, university and timezone',
        'Set semester start and end dates',
        'Choose light or dark theme, and sign out',
      ]}
    />
  )
}
