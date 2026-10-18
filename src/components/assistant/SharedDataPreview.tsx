import type { AssistantRequest } from '@shared/study-assistant-contract'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

/**
 * Shows exactly what "Get AI suggestions" would send, so nothing about the
 * AI's view of the student's data is hidden.
 */
export function SharedDataPreview({ request }: { request: AssistantRequest }) {
  const counts = [
    `${request.assignments.length} assignment(s)`,
    `${request.exams.length} exam(s)`,
    `${request.courses.length} course(s)`,
  ].join(', ')

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          <h2>What the AI would see</h2>
        </CardTitle>
        <CardDescription>
          Only when you ask for AI suggestions: {counts}, and this week's study minutes per course. Your
          name, email, descriptions, notes, locations and grades are never sent.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <details className="text-sm">
          <summary className="cursor-pointer font-medium">Show the exact data</summary>
          <pre className="mt-2 max-h-80 overflow-auto rounded-md bg-muted p-3 text-xs whitespace-pre-wrap break-words">
            {JSON.stringify(request, null, 2)}
          </pre>
        </details>
      </CardContent>
    </Card>
  )
}
