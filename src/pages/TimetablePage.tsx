import { ComingSoon } from '@/components/ComingSoon'

export function TimetablePage() {
  return (
    <ComingSoon
      title="Timetable"
      description="Your weekly class schedule."
      stage={4}
      plannedFeatures={[
        'Add, edit and delete weekly class sessions',
        'View a Monday to Sunday grid in course colors',
        'See overlapping classes flagged instead of rejected',
      ]}
    />
  )
}
