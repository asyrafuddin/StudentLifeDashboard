import { ComingSoon } from '@/components/ComingSoon'

export function GradesPage() {
  return (
    <ComingSoon
      title="Grades & GPA"
      description="Assessment results, course grades and GPA."
      stage={5}
      plannedFeatures={[
        'Record weighted assessment scores per course',
        'Enter final course grades directly if your university requires it',
        'See semester and cumulative GPA, with excluded courses explained',
        'Configure your university\'s grading scale',
      ]}
    />
  )
}
