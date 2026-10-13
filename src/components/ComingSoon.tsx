import { Construction } from 'lucide-react'
import { Link } from 'react-router'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface ComingSoonProps {
  title: string
  description: string
  stage: number
  /** What this page will let the student do once built. */
  plannedFeatures: string[]
}

/**
 * An honest placeholder for pages that are not built yet, so no button in the
 * app silently does nothing.
 */
export function ComingSoon({ title, description, stage, plannedFeatures }: ComingSoonProps) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <Card>
        <CardContent className="flex flex-col gap-4 py-2 sm:flex-row sm:items-start">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
            <Construction className="size-5 text-muted-foreground" aria-hidden />
          </div>
          <div className="space-y-3">
            <div>
              <p className="font-medium">Not built yet — planned for Stage {stage}</p>
              <p className="text-sm text-muted-foreground">
                This page doesn't save or show any data yet. Once it's built, you'll be able to:
              </p>
            </div>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {plannedFeatures.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            <Button asChild variant="outline" size="sm">
              <Link to="/">Back to dashboard</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
