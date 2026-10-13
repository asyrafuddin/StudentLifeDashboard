import { SearchX } from 'lucide-react'
import { Link } from 'react-router'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <EmptyState icon={SearchX} title="Page not found" description="The page you're looking for doesn't exist." className="py-24">
      <Button asChild>
        <Link to="/">Go to dashboard</Link>
      </Button>
    </EmptyState>
  )
}
