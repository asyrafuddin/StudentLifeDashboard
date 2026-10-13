import { FlaskConical } from 'lucide-react'
import { Link } from 'react-router'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

/**
 * Shown on pages that create and save records when the app is in demo mode.
 * Pretending to save in demo mode would be misleading, so we explain instead.
 */
export function RequiresAccount({ title, description }: { title: string; description: string }) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <Card>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-200">
            <FlaskConical className="size-5" aria-hidden />
          </div>
          <div className="space-y-2 text-sm">
            <p className="font-medium">This page saves data, so it needs a real account</p>
            <p className="text-muted-foreground">
              You're in demo mode, where nothing is saved. Connect Supabase by following{' '}
              <span className="font-medium text-foreground">docs/supabase-setup.md</span>, then sign up to start
              adding your own records.
            </p>
            <Button asChild variant="outline" size="sm">
              <Link to="/">View the demo dashboard</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
