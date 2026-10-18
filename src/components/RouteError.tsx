import { AlertTriangle, RotateCcw, Sparkles } from 'lucide-react'
import { isRouteErrorResponse, Link, useRouteError } from 'react-router'
import { Button } from '@/components/ui/button'
import { isOutdatedAppError } from '@/lib/errors'

/**
 * Shown instead of a page that crashed while rendering, so the user sees a
 * calm explanation and a way forward instead of a raw developer error screen.
 * Their saved data is safe: a display error doesn't touch the database.
 */
export function RouteError() {
  const error = useRouteError()
  // Details help when reporting the problem; they're logged for developers too.
  const detail = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : String(error)
  console.error(error)

  if (isOutdatedAppError(detail)) {
    return (
      <div role="alert" className="mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center">
        <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10">
          <Sparkles className="size-6 text-primary" aria-hidden />
        </div>
        <h1 className="text-lg font-semibold">A new version of the app is available</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The app was updated while this tab was open. Reload to continue; your saved data is safe.
        </p>
        <Button className="mt-6" onClick={() => window.location.reload()}>
          <RotateCcw aria-hidden /> Reload
        </Button>
      </div>
    )
  }

  return (
    <div role="alert" className="mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="size-6 text-destructive" aria-hidden />
      </div>
      <h1 className="text-lg font-semibold">Something went wrong on this page</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Your saved data is safe. Reloading usually fixes this. If it keeps happening, please report the details below.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button onClick={() => window.location.reload()}>
          <RotateCcw aria-hidden /> Reload page
        </Button>
        <Button asChild variant="outline">
          <Link to="/" reloadDocument>
            Go to dashboard
          </Link>
        </Button>
      </div>
      <details className="mt-6 w-full text-left text-xs text-muted-foreground">
        <summary className="cursor-pointer">Technical details</summary>
        <pre className="mt-2 overflow-x-auto rounded-lg bg-muted p-3 whitespace-pre-wrap">{detail}</pre>
      </details>
    </div>
  )
}
