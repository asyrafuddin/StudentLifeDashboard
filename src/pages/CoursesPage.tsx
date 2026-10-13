import { ComingSoon } from '@/components/ComingSoon'

export function CoursesPage() {
  return (
    <ComingSoon
      title="My Courses"
      description="Your courses for each semester."
      stage={3}
      plannedFeatures={[
        'Add, edit and delete courses (code, name, instructor, credits, color)',
        'Filter and search courses by semester',
        'See the assignments, exams and grades belonging to each course',
      ]}
    />
  )
}
