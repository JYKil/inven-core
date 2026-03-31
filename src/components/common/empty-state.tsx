import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
}: {
  title: string
  description?: string
  actionLabel?: string
  actionHref?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && (
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      )}
      {actionLabel && actionHref && (
        <Button render={<Link href={actionHref} />} size="sm" className="mt-4 bg-primary hover:bg-primary-hover">
            <Plus className="h-4 w-4 mr-1" />
            {actionLabel}
        </Button>
      )}
    </div>
  )
}
