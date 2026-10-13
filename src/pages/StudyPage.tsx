import { ComingSoon } from '@/components/ComingSoon'

export function StudyPage() {
  return (
    <ComingSoon
      title="Study Tracker"
      description="Record and review your study time."
      stage={5}
      plannedFeatures={[
        'Start and stop a study timer, or log a session manually',
        'Link sessions to a course and add notes',
        'See daily and weekly study time, and time per course',
      ]}
    />
  )
}
