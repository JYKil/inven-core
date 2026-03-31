import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// DESIGN.md: 두꺼운 테두리 정방형 스타일 (결재 도장 느낌)
const statusStyles: Record<string, string> = {
  draft: 'border-[1.5px] border-muted-foreground text-text-secondary bg-transparent',
  confirmed: 'border-[1.5px] border-info text-info bg-transparent',
  partially_received: 'border-[1.5px] border-warning text-warning bg-transparent',
  received: 'border-[1.5px] border-secondary text-secondary bg-transparent',
  completed: 'border-[1.5px] border-secondary text-secondary bg-transparent',
  shipped: 'border-[1.5px] border-secondary text-secondary bg-transparent',
  cancelled: 'border-[1.5px] border-destructive text-destructive bg-transparent',
}

const statusLabels: Record<string, string> = {
  draft: '임시저장',
  confirmed: '확정',
  partially_received: '부분입고',
  received: '입고완료',
  completed: '완료',
  shipped: '출고완료',
  cancelled: '취소',
}

export function StatusBadge({
  status,
  className,
}: {
  status: string
  className?: string
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'rounded-[3px] font-medium text-xs px-2 py-0.5',
        statusStyles[status] ?? statusStyles.draft,
        className,
      )}
    >
      {statusLabels[status] ?? status}
    </Badge>
  )
}
