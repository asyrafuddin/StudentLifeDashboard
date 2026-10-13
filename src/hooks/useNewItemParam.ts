import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'

/**
 * Supports links like "/assignments?new=1" (used by the dashboard's quick
 * actions). Returns true once if the page was opened with ?new=1, then removes
 * the parameter so refreshing the page doesn't reopen the form.
 */
export function useNewItemParam(): boolean {
  const [params, setParams] = useSearchParams()
  const [requested] = useState(() => params.has('new'))

  useEffect(() => {
    if (params.has('new')) {
      setParams(
        (p) => {
          p.delete('new')
          return p
        },
        { replace: true },
      )
    }
  }, [params, setParams])

  return requested
}
