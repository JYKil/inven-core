import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus, type LucideIcon } from 'lucide-react'

export function EmptyState({
  title,
  description,
  icon: Icon,
  actionLabel,
  actionHref,
  onAction,
}: {
  title: string
  description?: string
  icon?: LucideIcon
  actionLabel?: string
  actionHref?: string
  onAction?: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && <Icon className="h-10 w-10 text-muted-foreground/50 mb-3" />}
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
      {actionLabel && onAction && !actionHref && (
        <Button onClick={onAction} size="sm" className="mt-4 bg-primary hover:bg-primary-hover">
            <Plus className="h-4 w-4 mr-1" />
            {actionLabel}
        </Button>
      )}
    </div>
  )
}
