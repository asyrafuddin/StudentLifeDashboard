import { ComingSoon } from '@/components/ComingSoon'

export function AssignmentsPage() {
  return (
    <ComingSoon
      title="Assignments"
      description="Track coursework and deadlines."
      stage={3}
      plannedFeatures={[
        'Add, edit, delete and complete assignments',
        'Filter by course, priority, status and due date',
        'Sort by nearest deadline, with overdue work highlighted',
      ]}
    />
  )
}
