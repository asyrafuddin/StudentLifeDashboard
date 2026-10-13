import { ComingSoon } from '@/components/ComingSoon'

export function ExamsPage() {
  return (
    <ComingSoon
      title="Exams"
      description="Upcoming exams and assessments."
      stage={4}
      plannedFeatures={[
        'Record exam title, course, date, time, location and type',
        'See upcoming exams in order with a countdown',
      ]}
    />
  )
}
