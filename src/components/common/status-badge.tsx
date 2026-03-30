import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// DESIGN.md: 두꺼운 테두리 정방형 스타일 (결재 도장 느낌)
const statusStyles: Record<string, string> = {
  draft: 'border-[1.5px] border-[#9C9189] text-[#6B6158] bg-transparent',
  confirmed: 'border-[1.5px] border-[#4A7B94] text-[#4A7B94] bg-transparent',
  partially_received: 'border-[1.5px] border-[#C4901A] text-[#C4901A] bg-transparent',
  received: 'border-[1.5px] border-[#2B7A6F] text-[#2B7A6F] bg-transparent',
  completed: 'border-[1.5px] border-[#2B7A6F] text-[#2B7A6F] bg-transparent',
  shipped: 'border-[1.5px] border-[#2B7A6F] text-[#2B7A6F] bg-transparent',
  cancelled: 'border-[1.5px] border-[#B83A2A] text-[#B83A2A] bg-transparent',
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
